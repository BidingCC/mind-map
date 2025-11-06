import { BaseService } from "@buildingai/core/modules/base/services/base.service";
import type { UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { HttpErrorFactory } from "@buildingai/errors";
import { PublicUserService } from "@buildingai/extension-sdk/services/user.service";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In } from "typeorm";
import { Repository } from "typeorm";

import { MindMapRecord } from "../../../db/entities/mind-map-record.entity";
import { CreateMindMapDto } from "../dto/create-mind-map.dto";
import { BatchDeleteMindMapRecordDto } from "../dto/delete-mind-map-record.dto";
import { PaginationDto } from "../dto/pagination.dto";
import { SearchMindMapRecordDto } from "../dto/search-mind-map-record.dto";
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

    /**
     * 删除思维导图记录
     * @param id 思维导图记录ID
     * @returns 是否成功
     */
    async delete(id: string): Promise<void> {
        const mindMapRecord = await this.MindMapRecordRepository.findOne({
            where: {
                id,
            },
        });
        if (!mindMapRecord) {
            throw HttpErrorFactory.notFound("The mind map record does not exist");
        }

        await this.MindMapRecordRepository.delete(id);
    }

    /**
     * 批量删除思维导图记录
     * @param batchDeleteDto 批量删除DTO
     * @returns 是否成功
     */
    async deleteBatch(dto: BatchDeleteMindMapRecordDto): Promise<void> {
        const { ids } = dto;
        const records = await this.MindMapRecordRepository.find({
            where: { id: In(ids) },
        });
        if (records.length !== ids.length) {
            throw HttpErrorFactory.notFound("Some mind map records do not exist");
        }

        await this.MindMapRecordRepository.delete(ids);
    }

    /**
     * 搜索思维导图记录
     * @param searchDto 搜索DTO
     * @returns 分页思维导图记录列表
     */
    async search(searchDto: SearchMindMapRecordDto): Promise<PaginationResult<MindMapRecord>> {
        const {
            username,
            userId,
            description,
            startDate,
            endDate,
            page = 1,
            pageSize = 10,
        } = searchDto;

        const queryBuilder = this.MindMapRecordRepository.createQueryBuilder("mindMapRecord");

        if (username) {
            queryBuilder.andWhere("mindMapRecord.userName LIKE :username", {
                username: `%${username}%`,
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

        if (startDate) {
            queryBuilder.andWhere("mindMapRecord.createdAt >= :startDate", { startDate });
        }

        if (endDate) {
            queryBuilder.andWhere("mindMapRecord.createdAt <= :endDate", { endDate });
        }

        // 添加排序
        queryBuilder.orderBy("mindMapRecord.createdAt", "DESC");

        // 计算总数
        const total = await queryBuilder.getCount();

        // 添加分页
        const skip = (page - 1) * pageSize;
        queryBuilder.skip(skip).take(pageSize);

        // 获取分页数据
        const items = await queryBuilder.getMany();

        // 计算总页数
        const totalPages = Math.ceil(total / pageSize);

        // 返回分页结果
        return {
            items,
            total,
            page,
            pageSize,
            totalPages,
        };
    }

    /**
     * 创建思维导图记录
     * @param createMindMapDto 创建思维导图DTO
     * @returns 创建的思维导图记录
     */
    async createMindMap(
        createMindMapDto: CreateMindMapDto,
        user: UserPlayground,
    ): Promise<MindMapRecord> {
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
        return await this.MindMapRecordRepository.save(mindMapRecord);
    }

    /**
     * 获取思维导图记录列表
     * @param listDto 列表DTO
     * @returns 分页思维导图记录列表
     */
    async list(listDto: PaginationDto): Promise<PaginationResult<MindMapRecord>> {
        const { page = 1, pageSize = 10 } = listDto;

        // 创建查询构建器
        const queryBuilder = this.MindMapRecordRepository.createQueryBuilder("mindMapRecord");

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

        // 返回分页结果
        return {
            items,
            total,
            page,
            pageSize,
            totalPages,
        };
    }

    /**
     * 删除思维导图记录
     * @param id 思维导图记录ID
     * @returns 是否成功
     */
    async deleteUser(id: string): Promise<void> {
        const mindMapRecord = await this.MindMapRecordRepository.findOne({
            where: {
                id,
            },
        });
        if (!mindMapRecord) {
            throw HttpErrorFactory.notFound("The mind map record does not exist");
        }

        await this.MindMapRecordRepository.delete(id);
    }

    /**
     * 更新思维导图名称
     * @param id 思维导图ID
     * @param title 新名称
     * @returns 更新后的思维导图记录
     */
    async updateTitle(id: string, title: string): Promise<MindMapRecord> {
        const mindMapRecord = await this.MindMapRecordRepository.findOne({
            where: { id },
        });

        if (!mindMapRecord) {
            throw HttpErrorFactory.notFound("The mind map record does not exist");
        }

        mindMapRecord.description = title;
        return await this.MindMapRecordRepository.save(mindMapRecord);
    }
}
