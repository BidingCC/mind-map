import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import type { UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { In, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { PublicUserService } from "@buildingai/extension-sdk/services/user.service";
import { Injectable } from "@nestjs/common";

import { MindMapRecord } from "../../../db/entities/mind-map-record.entity";
import { CreateMindMapDto } from "../dto/create-mind-map.dto";
import { BatchDeleteMindMapRecordDto } from "../dto/delete-mind-map-record.dto";
import { PaginationDto } from "../dto/pagination.dto";
import { SearchMindMapRecordDto } from "../dto/search-mind-map-record.dto";
import { MindMapRecordPublicInterface } from "../interfaces/mind-map-record.interface";
import { PaginationResult } from "../interfaces/pagination-result.interface";

@Injectable()
export class RecordService extends BaseService<MindMapRecord> {
    constructor(
        @InjectRepository(MindMapRecord)
        private readonly MindMapRecordRepository: Repository<MindMapRecord>,
        private readonly userService: PublicUserService,
    ) {
        super(MindMapRecordRepository);
    }

    // =================================================================
    // 后台用户服务
    // =================================================================

    /**
     * 删除思维导图记录
     * @param id 思维导图记录ID
     * @returns 是否成功
     */
    async delete(id: string): Promise<void> {
        try {
            const mindMapRecord = await this.MindMapRecordRepository.findOne({
                where: {
                    id,
                },
            });
            if (!mindMapRecord) {
                this.logger.warn("[MindMapExtension] 思维导图记录不存在", { id });
                throw HttpErrorFactory.notFound("The mind map record does not exist");
            }

            await this.MindMapRecordRepository.delete(id);
            this.logger.debug("[MindMapExtension] 思维导图记录删除成功", { id });
        } catch (error) {
            this.logger.error("[MindMapExtension] 删除思维导图记录时出错:", error);
            throw HttpErrorFactory.internal("Failed to delete mind map record.");
        }
    }

    /**
     * 批量删除思维导图记录
     * @param batchDeleteDto 批量删除DTO
     * @returns 是否成功
     */
    async deleteBatch(dto: BatchDeleteMindMapRecordDto): Promise<void> {
        try {
            const { ids } = dto;
            const records = await this.MindMapRecordRepository.find({
                where: { id: In(ids) },
            });
            if (records.length !== ids.length) {
                this.logger.warn("[MindMapExtension] 部分思维导图记录不存在", {
                    requestIds: ids,
                    foundRecords: records.length,
                });
                throw HttpErrorFactory.notFound("Some mind map records do not exist");
            }

            await this.MindMapRecordRepository.delete(ids);
            this.logger.debug("[MindMapExtension] 批量删除思维导图记录成功", { count: ids.length });
        } catch (error) {
            this.logger.error("[MindMapExtension] 批量删除思维导图记录时出错:", error);
            throw HttpErrorFactory.internal("Failed to delete mind map records.");
        }
    }

    /**
     * 搜索思维导图记录
     * @param queryDto 查询参数
     * @returns 分页思维导图记录列表
     */
    async search(queryDto: SearchMindMapRecordDto): Promise<PaginationResult<MindMapRecord>> {
        try {
            const {
                page = 1,
                pageSize = 10,
                userName,
                userId,
                description,
                startDate,
                endDate,
            } = queryDto;

            const queryBuilder = this.MindMapRecordRepository.createQueryBuilder("mindMapRecord");

            // 只在参数不为空时添加对应的where条件
            if (userName) {
                queryBuilder.andWhere("mindMapRecord.userName LIKE :userName", {
                    userName: `%${userName}%`,
                });
            }

            if (userId) {
                queryBuilder.andWhere("mindMapRecord.userId LIKE :userId", {
                    userId: `%${userId}%`,
                });
            }

            if (description) {
                queryBuilder.andWhere("mindMapRecord.description LIKE :description", {
                    description: `%${description}%`,
                });
            }

            // 时间范围查询 - 支持单独的开始时间或结束时间
            if (startDate && endDate) {
                queryBuilder.andWhere("mindMapRecord.createdAt BETWEEN :startDate AND :endDate", {
                    startDate,
                    endDate,
                });
            } else if (startDate) {
                queryBuilder.andWhere("mindMapRecord.createdAt >= :startDate", { startDate });
            } else if (endDate) {
                queryBuilder.andWhere("mindMapRecord.createdAt <= :endDate", { endDate });
            }

            // 先获取总数（在应用分页之前）
            const total = await queryBuilder.getCount();

            // 然后应用分页和排序
            queryBuilder
                .orderBy("mindMapRecord.createdAt", "DESC")
                .skip((page - 1) * pageSize)
                .take(pageSize);

            const { entities } = await queryBuilder.getRawAndEntities();

            const data = entities.map((entity) => {
                return {
                    ...entity,
                };
            });

            // 计算总页数
            const totalPages = Math.ceil(total / pageSize);

            this.logger.debug("[MindMapExtension] 搜索思维导图记录成功", { total, page, pageSize });
            // 返回统一格式的对象
            return {
                items: data,
                total: total,
                page: page,
                pageSize: pageSize,
                totalPages: totalPages,
            };
        } catch (error) {
            this.logger.error("[MindMapExtension] 搜索思维导图记录时出错:", error);
            throw HttpErrorFactory.internal("Failed to get mind map records.");
        }
    }

    // =================================================================
    // 前台用户服务
    // =================================================================

    /**
     * 创建思维导图记录
     * @param createMindMapDto 创建思维导图DTO
     * @returns 创建的思维导图记录ID
     */
    async createMindMap(createMindMapDto: CreateMindMapDto, user: UserPlayground): Promise<string> {
        try {
            // 创建新的思维导图记录实例
            const mindMapRecord = new MindMapRecord();

            // 设置基本属性
            mindMapRecord.userId = user.id;
            mindMapRecord.description = createMindMapDto.description;
            mindMapRecord.powerUsed = createMindMapDto.powerUsed;
            mindMapRecord.createdAt = new Date();
            mindMapRecord.updatedAt = new Date();
            mindMapRecord.conversationTimes = 0;

            // 获取用户信息
            const userInfo = await this.userService.findUserById(user.id);
            mindMapRecord.userName = userInfo.nickname;
            mindMapRecord.userAvatar = userInfo.avatar;

            // 根据type设置layout
            const typeToLayoutMap: Record<string, string> = {
                blank: "mindMap",
                logicalStructure: "logicalStructure",
                mindMap: "mindMap",
                organizationStructure: "organizationStructure",
                fishbone: "fishbone",
            };

            const layout = typeToLayoutMap[createMindMapDto.type] || "mindMap";

            // 设置思维导图数据
            if (createMindMapDto.type === "blank") {
                mindMapRecord.mindMapData = {
                    root: {
                        data: {
                            text: "中心主题",
                            uid: "1",
                        },
                        children: [],
                    },
                    theme: { template: "default", config: {} },
                    layout: layout,
                    config: {},
                    view: {},
                };
            } else {
                mindMapRecord.mindMapData = {
                    root: {
                        data: {
                            text: "中心主题",
                            uid: "1",
                        },
                        children: [
                            {
                                data: {
                                    text: "分支主题1",
                                    uid: "2",
                                },
                                children: [],
                            },
                            {
                                data: {
                                    text: "分支主题2",
                                    uid: "3",
                                },
                                children: [],
                            },
                            {
                                data: {
                                    text: "分支主题3",
                                    uid: "4",
                                },
                                children: [],
                            },
                        ],
                    },
                    theme: { template: "default", config: {} },
                    layout: layout,
                    config: {},
                    view: {},
                };
            }

            // 保存并返回创建的记录
            const rs = await this.MindMapRecordRepository.save(mindMapRecord);
            this.logger.debug("[MindMapExtension] 创建思维导图记录成功", { id: rs.id });
            return rs.id;
        } catch (error) {
            this.logger.error("[MindMapExtension] 创建思维导图记录时出错:", error);
            throw HttpErrorFactory.internal("Failed to create mind map record.");
        }
    }

    /**
     * 获取思维导图记录列表
     * @param listDto 列表DTO
     * @param user 当前用户信息
     * @returns 分页思维导图记录列表
     */
    async list(
        listDto: PaginationDto,
        user: UserPlayground,
    ): Promise<PaginationResult<MindMapRecordPublicInterface>> {
        try {
            const { page = 1, pageSize = 10 } = listDto;

            // 创建查询构建器
            const queryBuilder = this.MindMapRecordRepository.createQueryBuilder("mindMapRecord");

            // 添加用户过滤条件
            queryBuilder.where("mindMapRecord.userId = :userId", { userId: user.id });

            // 添加排序
            queryBuilder.orderBy("mindMapRecord.updatedAt", "DESC");

            // 计算总数
            const total = await queryBuilder.getCount();

            // 添加分页
            const skip = (page - 1) * pageSize;
            queryBuilder.skip(skip).take(pageSize);

            // 获取分页数据
            const items = await queryBuilder.getMany();

            // 计算总页数
            const totalPages = Math.ceil(total / pageSize);

            const publicItems = items.map((item) => ({
                id: item.id,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                description: item.description,
                mindMapData: item.mindMapData,
                aiChatRecordId: item.aiChatRecordId,
            }));

            this.logger.debug("[MindMapExtension] 获取思维导图记录列表成功", {
                userId: user.id,
                total,
                page,
                pageSize,
            });
            // 返回分页结果
            return {
                items: publicItems,
                total,
                page,
                pageSize,
                totalPages,
            };
        } catch (error) {
            this.logger.error("[MindMapExtension] 获取思维导图记录列表时出错:", error);
            throw HttpErrorFactory.internal("Failed to get mind map records.");
        }
    }

    /**
     * 删除思维导图记录
     * @param id 思维导图记录ID
     * @param userId 当前用户ID
     * @returns 是否成功
     */
    async deleteUser(id: string, userId?: string): Promise<boolean> {
        try {
            const mindMapRecord = await this.MindMapRecordRepository.findOne({
                where: {
                    id,
                },
            });
            if (!mindMapRecord) {
                this.logger.warn("[MindMapExtension] 思维导图记录不存在", { id });
                throw HttpErrorFactory.notFound("The mind map record does not exist");
            }

            if (userId && mindMapRecord.userId !== userId) {
                this.logger.warn("[MindMapExtension] 无权限删除该记录", { id, userId });
                throw HttpErrorFactory.forbidden("No permission to delete this record");
            }

            const result = await this.MindMapRecordRepository.delete(id);
            this.logger.debug("[MindMapExtension] 用户删除思维导图记录成功", { id, userId });
            return (result.affected ?? 0) > 0;
        } catch (error) {
            this.logger.error("[MindMapExtension] 删除思维导图记录时出错:", error);
            throw HttpErrorFactory.internal("Delete mind map record failed");
        }
    }

    /**
     * 更新思维导图名称
     * @param id 思维导图ID
     * @param title 新名称
     * @param userId 当前用户ID
     * @returns 是否成功
     */
    async updateTitle(id: string, title: string, userId?: string): Promise<boolean> {
        try {
            const mindMapRecord = await this.MindMapRecordRepository.findOne({
                where: { id },
            });

            if (!mindMapRecord) {
                this.logger.warn("[MindMapExtension] 思维导图记录不存在", { id });
                throw HttpErrorFactory.notFound("The mind map record does not exist");
            }

            // 如果提供了userId，则验证当前用户是否为记录创建者
            if (userId && mindMapRecord.userId !== userId) {
                this.logger.warn("[MindMapExtension] 无权限修改该记录", { id, userId });
                throw HttpErrorFactory.forbidden("No permission to modify this record");
            }

            mindMapRecord.description = title;
            const result = await this.MindMapRecordRepository.save(mindMapRecord);
            this.logger.debug("[MindMapExtension] 更新思维导图名称成功", { id, title });
            return result !== null;
        } catch (error) {
            this.logger.error("[MindMapExtension] 更新思维导图名称时出错:", error);
            throw HttpErrorFactory.internal("Update mind map record failed");
        }
    }
}
