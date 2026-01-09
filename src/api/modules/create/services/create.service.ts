import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { FindManyOptions, In, Repository } from "@buildingai/db/typeorm";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { buildWhere } from "@buildingai/utils";
import { Injectable } from "@nestjs/common";

import { MindMapAiChatMessage } from "../../../db/entities/mind-map-ai-chat-message.entity";
import { MindMapAiChatRecord } from "../../../db/entities/mind-map-ai-chat-record.entity";
import { MindMapConfig } from "../../../db/entities/mind-map-config.entity";
import { MindMapRecord } from "../../../db/entities/mind-map-record.entity";
import { ConfigService } from "../../config/services/config.service";
import {
    ConversationStatus,
    CreateAIChatRecordDto,
    CreateMessageDto,
    UpdateAIChatRecordDto,
    UpdateMessageDto,
} from "../dto/ai-chat-record.dto";
import { SaveMindMapDto } from "../dto/save-mind-map.dto";
import { MindMapRecordPublicInterface } from "../interfaces/mind-map-record.interface";

@Injectable()
export class CreateService extends BaseService<MindMapRecord> {
    constructor(
        @InjectRepository(MindMapRecord)
        private readonly mindMapRecordRepository: Repository<MindMapRecord>,
        @InjectRepository(MindMapAiChatRecord)
        private readonly conversationRepository: Repository<MindMapAiChatRecord>,
        @InjectRepository(MindMapAiChatMessage)
        private readonly messageRepository: Repository<MindMapAiChatMessage>,
        private readonly configService: ConfigService,
    ) {
        super(mindMapRecordRepository);
    }

    /**
     * 获取插件配置
     * @returns 插件配置
     */
    async getConfig(): Promise<MindMapConfig> {
        try {
            return await this.configService.getConfig();
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 获取插件配置时出错: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("获取配置失败");
        }
    }

    /**
     * 保存思维导图记录
     * @param saveMindMapDto 保存思维导图DTO
     * @param userId 当前用户ID
     * @returns 是否成功
     */
    async saveMindMap(saveMindMapDto: SaveMindMapDto, userId?: string): Promise<boolean> {
        try {
            // 如果提供了userId，则验证当前用户是否为记录创建者
            if (userId) {
                const mindMapRecord = await this.mindMapRecordRepository.findOne({
                    where: { id: saveMindMapDto.id },
                });

                if (!mindMapRecord) {
                    throw HttpErrorFactory.notFound("思维导图记录不存在");
                }

                if (mindMapRecord.userId !== userId) {
                    throw HttpErrorFactory.forbidden("无权限保存该记录");
                }
            }

            const result = await this.updateById(saveMindMapDto.id, saveMindMapDto);
            return result !== null;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 保存思维导图记录时出错: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("保存思维导图记录失败");
        }
    }

    /**
     * 获取思维导图详情
     * @param id 思维导图ID
     * @param userId 当前用户ID
     * @returns 思维导图记录
     */
    async getDetail(id: string, userId: string): Promise<MindMapRecordPublicInterface> {
        try {
            const mindMapRecord = await this.mindMapRecordRepository.findOne({
                where: { id },
            });

            if (!mindMapRecord) {
                throw HttpErrorFactory.notFound("思维导图记录不存在");
            }

            // 检查当前用户是否为思维导图的创建者
            if (mindMapRecord.userId !== userId) {
                throw HttpErrorFactory.forbidden("无权限查看该思维导图");
            }

            // 返回公开接口数据结构
            return {
                id: mindMapRecord.id,
                createdAt: mindMapRecord.createdAt,
                updatedAt: mindMapRecord.updatedAt,
                description: mindMapRecord.description,
                mindMapData: mindMapRecord.mindMapData,
                aiChatRecordId: mindMapRecord.aiChatRecordId,
            };
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 获取思维导图详情时出错: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("获取思维导图记录失败");
        }
    }

    /**
     * 更新思维导图名称
     * @param id 思维导图ID
     * @param title 新名称
     * @param userId 当前用户ID
     * @returns 更新是否成功
     */
    async updateTitle(id: string, title: string, userId?: string): Promise<boolean> {
        try {
            // 如果提供了userId，则验证当前用户是否为记录创建者
            if (userId) {
                const mindMapRecord = await this.mindMapRecordRepository.findOne({
                    where: { id },
                });

                if (!mindMapRecord) {
                    this.logger.warn("[MindMapExtension] 思维导图记录不存在", { id, userId });
                    return false;
                }

                if (mindMapRecord.userId !== userId) {
                    this.logger.warn("[MindMapExtension] 无权限修改该记录", { id, userId });
                    return false;
                }
            }

            if (!title) {
                throw HttpErrorFactory.paramError("标题不能为空");
            }

            const saved = await this.updateById(id, { description: title });
            this.logger.debug(`[MindMapExtension] 更新思维导图名称成功: id=${id}`);
            return saved != null;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 更新思维导图名称时出错: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("更新思维导图记录失败");
        }
    }

    /**
     * 通过对话ID更新思维导图记录
     * @param conversationId 对话ID
     * @param updates 要更新的字段对象
     * @returns 更新后的思维导图记录
     */
    async updateByConversationId(
        conversationId: string,
        updates: Partial<MindMapRecord>,
    ): Promise<MindMapRecord> {
        try {
            const mindMapRecord = await this.mindMapRecordRepository.findOne({
                where: { aiChatRecordId: conversationId },
            });

            if (!mindMapRecord) {
                throw HttpErrorFactory.notFound("思维导图记录不存在");
            }

            return await this.updateById(mindMapRecord.id, updates);
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 通过对话ID更新思维导图记录时出错: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("更新思维导图记录失败");
        }
    }

    /**
     * 思维导图记录的积分消耗
     * @param id 思维导图记录ID
     * @param powerUsed 消耗的积分
     * @returns 更新后的思维导图记录
     */
    async addPowerUsed(id: string, powerUsed: number): Promise<MindMapRecord> {
        try {
            const mindMapRecord = await this.mindMapRecordRepository.findOne({
                where: { id },
            });

            if (!mindMapRecord) {
                throw HttpErrorFactory.notFound("思维导图记录不存在");
            }

            // 累加积分消耗
            const updatedPowerUsed = mindMapRecord.powerUsed + powerUsed;
            return await this.updateById(id, { powerUsed: updatedPowerUsed });
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 思维导图记录的积分消耗时出错: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("更新思维导图记录失败");
        }
    }

    // =================== AI对话记录相关方法 ===================
    /**
     * 根据ID获取对话记录
     * @param id 对话记录ID
     * @returns 对话记录
     */
    async findOneConversationById(id: string): Promise<MindMapAiChatRecord | null> {
        try {
            return await this.conversationRepository.findOne({
                where: { id },
            });
        } catch (error) {
            this.logger.error(
                `[MindMapExtension] 获取对话记录时出错: id=${id}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            return null;
        }
    }

    /**
     * 创建新对话
     * @param userId 用户ID
     * @param dto 创建对话DTO
     */
    async createConversation(
        userId: string,
        dto: CreateAIChatRecordDto,
    ): Promise<MindMapAiChatRecord> {
        const conversationData: Partial<MindMapAiChatRecord> = {
            ...dto,
            userId,
            messageCount: 0,
            totalTokens: 0,
            status: ConversationStatus.ACTIVE,
        };

        try {
            const result = await this.conversationRepository.save(conversationData);
            this.logger.debug(`[MindMapExtension] 成功创建对话: conversationId=${result.id}`);
            return result;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 创建对话失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("创建对话失败");
        }
    }

    /**
     * 根据ID获取对话详情
     * @param conversationId 对话ID
     * @param userId 用户ID
     */
    async getConversationWithMessages(
        conversationId: string | undefined,
        userId?: string,
    ): Promise<Partial<MindMapAiChatRecord> | null> {
        try {
            const where = buildWhere<MindMapAiChatRecord>({
                isDeleted: false,
                userId,
            });

            const result = await this.conversationRepository.findOne({
                where: { id: conversationId, ...where },
            });

            console.log(`[MindMapExtension] 获取对话详情成功: conversationId=${conversationId}`);
            return result;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 获取对话详情失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("获取对话详情失败");
        }
    }

    /**
     * 更新对话信息
     * @param conversationId 对话ID
     * @param userId 用户ID，空字符串表示管理员操作
     * @param dto 更新数据
     */
    async updateConversation(
        conversationId: string,
        userId: string,
        dto: UpdateAIChatRecordDto,
    ): Promise<MindMapAiChatRecord> {
        try {
            // 构建 where 条件
            const whereCondition: {
                id: string;
                isDeleted: boolean;
                userId?: string;
            } = {
                id: conversationId,
                isDeleted: false,
            };

            // 如果不是管理员操作，需要验证用户权限
            if (userId && userId.trim() !== "") {
                whereCondition.userId = userId;
            }

            // 先查找记录
            const record = await this.conversationRepository.findOne({
                where: whereCondition,
            });

            if (!record) {
                this.logger.warn(`[MindMapExtension] 对话记录不存在: ${conversationId}`);
                throw HttpErrorFactory.notFound("对话记录不存在");
            }

            // 更新字段
            Object.assign(record, dto);

            const result = await this.conversationRepository.save(record);
            this.logger.debug(`[MindMapExtension] 对话更新成功: conversationId=${conversationId}`);
            return result;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 更新对话信息失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("更新对话失败");
        }
    }

    /**
     * 删除对话
     * @param conversationId 对话ID
     * @param userId 用户ID
     */
    async deleteConversation(conversationId: string): Promise<void> {
        if (!conversationId) {
            this.logger.warn("[MindMapExtension] 删除对话失败:对话ID为空");
            return;
        }

        try {
            const queryBuilder = this.conversationRepository
                .createQueryBuilder()
                .delete()
                .from(MindMapAiChatRecord)
                .where("id = :conversationId", { conversationId });

            await queryBuilder.execute();
            this.logger.debug(`[MindMapExtension] 对话删除成功: conversationId=${conversationId}`);
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 删除对话失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("删除对话失败");
        }
    }

    /**
     * 前台用户删除对话（带权限验证）
     * @param conversationId 对话ID
     * @param userId 当前用户ID
     * @returns 是否删除成功
     */
    async deleteUserConversation(conversationId: string, userId: string): Promise<boolean> {
        try {
            if (!conversationId) {
                this.logger.warn(`[MindMapExtension] 删除对话失败:对话ID为空, userId=${userId}`);
                return false;
            }

            // 先检查对话是否存在并属于当前用户
            const conversation = await this.conversationRepository.findOne({
                where: {
                    id: conversationId,
                    userId: userId,
                },
            });

            if (!conversation) {
                this.logger.warn(
                    `[MindMapExtension] 删除对话失败:对话不存在或用户无权限, conversationId=${conversationId}, userId=${userId}`,
                );
                return false;
            }

            const result = await this.conversationRepository.delete({
                id: conversationId,
                userId: userId,
            });
            this.logger.debug(
                `[MindMapExtension] 用户对话删除成功: conversationId=${conversationId}, userId=${userId}`,
            );
            return (result.affected ?? 0) > 0;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 删除对话失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("删除对话失败");
        }
    }

    /**
     * 批量删除对话
     * @param ids 对话ID数组
     * @param userId 用户ID
     */
    async batchDeleteConversations(ids: string[]): Promise<void> {
        if (!ids || ids.length === 0) {
            console.log("[MindMapExtension] 批量删除对话:空ID列表");
            return;
        }

        try {
            const queryBuilder = this.conversationRepository
                .createQueryBuilder()
                .delete()
                .from(MindMapAiChatRecord)
                .where("id IN (:...ids)", { ids });

            await queryBuilder.execute();
            this.logger.debug(`[MindMapExtension] 批量删除对话成功: count=${ids.length}`);
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 批量删除对话失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("批量删除对话失败");
        }
    }

    /**
     * 更新对话摘要
     * @param conversationId 对话ID
     * @param summary 对话摘要
     */
    async updateConversationSummary(conversationId: string, summary: string): Promise<void> {
        try {
            await this.conversationRepository.update(conversationId, { summary });
            this.logger.debug(
                `[MindMapExtension] 对话摘要更新成功: conversationId=${conversationId}`,
            );
        } catch (error) {
            this.logger.error(
                `[MindMapExtension] 更新对话摘要失败: conversationId=${conversationId}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * 更新对话状态
     * @param conversationId 对话ID
     * @param status 对话状态
     */
    async updateConversationStatus(
        conversationId: string,
        status: ConversationStatus,
    ): Promise<void> {
        try {
            await this.conversationRepository.update(conversationId, { status });
            this.logger.debug(
                `[MindMapExtension] 对话状态更新成功: conversationId=${conversationId}, status=${status}`,
            );
        } catch (error) {
            this.logger.error(
                `[MindMapExtension] 更新对话状态失败: conversationId=${conversationId}, status=${status}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    // =================== AI消息相关方法 ===================

    /**
     * 创建消息
     * @param dto 创建消息DTO
     */
    async createMessage(dto: CreateMessageDto): Promise<MindMapAiChatMessage> {
        try {
            // 获取下一个序号
            const lastMessage = await this.messageRepository.findOne({
                where: { conversationId: dto.conversationId },
                order: { sequence: "DESC" },
            });

            const sequence = (lastMessage?.sequence || 0) + 1;

            const messageData: Partial<MindMapAiChatMessage> = {
                ...dto,
                modelId: dto.modelId || undefined,
                sequence,
                status: dto.status || "completed",
            };

            const result = await this.messageRepository.save(messageData);
            console.log(`[MindMapExtension] 消息创建成功: messageId=${result.id}`);

            // 更新对话统计信息
            await this.updateConversationStats(dto.conversationId);

            return result;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 创建消息失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("创建消息失败");
        }
    }

    /**
     * 分页查询消息
     * @param paginationDto 分页参数
     * @param queryDto 查询条件
     */
    async findMessages(paginationDto: PaginationDto, queryDto?: { conversationId?: string }) {
        try {
            // 构建查询选项
            const options: FindManyOptions<MindMapAiChatMessage> = {
                order: { sequence: "DESC" as const },
                // where: { status: Not("failed") },
            };

            if (queryDto?.conversationId) {
                options.where = {
                    conversationId: queryDto.conversationId,
                    // status: Not("failed"),
                };
            }

            const page = paginationDto.page ?? 1;
            const pageSize = paginationDto.pageSize ?? 10;

            const [data, total] = await this.messageRepository.findAndCount({
                ...options,
                skip: (page - 1) * pageSize,
                take: pageSize,
            });

            const totalPages = Math.ceil(total / pageSize);
            console.log(
                `[MindMapExtension] 消息查询成功: total=${total}, page=${page}, pageSize=${pageSize}`,
            );
            return {
                items: data,
                total,
                page,
                pageSize,
                totalPages,
            };
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 分页查询消息时出错: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("获取消息失败");
        }
    }

    /**
     * 获取对话的消息列表
     * @param conversationId 对话ID
     * @param paginationDto 分页参数
     */
    async getConversationMessages(conversationId: string, paginationDto: PaginationDto) {
        try {
            if (!conversationId) {
                this.logger.warn("[MindMapExtension] 获取对话消息失败:对话ID为空");
                throw HttpErrorFactory.notFound("对话不存在");
            }
            const result = await this.findMessages(paginationDto, { conversationId });
            console.log(`[MindMapExtension] 获取对话消息成功: conversationId=${conversationId}`);
            return result;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 获取对话的消息列表时出错: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("获取消息失败");
        }
    }

    /**
     * 获取对话的消息列表(用于前台)
     * @param conversationId 对话ID
     * @param paginationDto 分页参数
     * @param userId 用户ID（用于权限检查）
     */
    async getConversationMessagesUser(
        conversationId: string,
        paginationDto: PaginationDto,
        userId: string,
    ) {
        try {
            if (!conversationId) {
                this.logger.warn("[MindMapExtension] 获取对话消息失败:对话ID为空");
                throw HttpErrorFactory.notFound("对话不存在");
            }

            // 检查对话是否属于当前用户
            const conversation = await this.getConversationWithMessages(conversationId, userId);

            if (!conversation) {
                this.logger.warn(
                    `[MindMapExtension] 获取对话消息失败:对话不存在或无权访问, conversationId=${conversationId}, userId=${userId}`,
                );
                throw HttpErrorFactory.badRequest("对话不存在或无权访问");
            }

            // 获取原始分页数据
            const result = await this.findMessages(paginationDto, { conversationId });

            const publicItems = result.items.map((item) => ({
                id: item.id,
                conversationId: item.conversationId,
                role: item.role,
                content: item.content,
                messageType: item.messageType,
                status: item.status,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            }));

            console.log(
                `[MindMapExtension] 获取对话消息成功(用户端): conversationId=${conversationId}`,
            );
            // 返回公共接口数据结构
            return {
                items: publicItems,
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
                totalPages: result.totalPages,
            };
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 获取对话的消息列表时出错: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("获取消息失败");
        }
    }

    /**
     * 更新消息
     * @param messageId 消息ID
     * @param dto 更新数据
     */
    async updateMessage(messageId: string, dto: UpdateMessageDto): Promise<void> {
        try {
            // 先查找消息
            const message = await this.messageRepository.findOne({
                where: { id: messageId },
            });

            if (!message) {
                this.logger.warn(`[MindMapExtension] [更新消息] 消息不存在: ${messageId}`);
                return;
            }

            // 更新字段
            Object.assign(message, dto);
            await this.messageRepository.save(message);
            this.logger.debug(`[MindMapExtension] 消息更新成功: messageId=${messageId}`);

            // 更新对话统计信息
            await this.updateConversationStats(message.conversationId);
        } catch (error) {
            this.logger.error(
                `[MindMapExtension] 更新消息失败: messageId=${messageId}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * 删除消息
     * @param messageId 消息ID
     */
    async deleteMessage(messageId: string): Promise<void> {
        // 先获取消息信息
        const message = await this.messageRepository.findOne({
            where: { id: messageId },
        });

        if (!message) {
            this.logger.warn(`[MindMapExtension] [删除消息] 消息不存在: ${messageId}`);
            return;
        }

        await this.messageRepository.delete(messageId);
        this.logger.debug(`[MindMapExtension] 消息删除成功: messageId=${messageId}`);

        // 更新对话统计信息
        await this.updateConversationStats(message.conversationId);
    }

    /**
     * 根据对话ID获取消息统计信息
     * @param conversationId 对话ID
     */
    async getMessageStats(conversationId: string): Promise<{
        messageCount: number;
        totalTokens: number;
        totalPower: number;
    }> {
        // 计算消息数量
        const messageCount = await this.messageRepository.count({
            where: { conversationId },
        });

        // Token统计仍需要使用QueryBuilder，因为涉及JSON字段聚合
        // 计算总Token数和总Power消耗
        const tokenStats = await this.messageRepository
            .createQueryBuilder("message")
            .select("COALESCE(SUM((tokens->>'total_tokens')::int), 0)", "totalTokens")
            .addSelect("COALESCE(SUM(message.user_consumed_power), 0)", "totalPower")
            .where("message.conversation_id = :conversationId", { conversationId })
            .getRawOne();

        console.log(`[MindMapExtension] 获取消息统计信息成功: conversationId=${conversationId}`);
        return {
            messageCount,
            totalTokens: parseInt(tokenStats.totalTokens) || 0,
            totalPower: parseInt(tokenStats.totalPower) || 0,
        };
    }

    // =================== 私有辅助方法 ===================

    /**
     * 更新对话统计信息
     */
    private async updateConversationStats(conversationId: string): Promise<void> {
        try {
            const stats = await this.getMessageStats(conversationId);

            await this.conversationRepository.update(conversationId, {
                messageCount: stats.messageCount,
                totalTokens: stats.totalTokens,
                totalPower: stats.totalPower,
            });

            // 同时更新思维导图记录
            await this.updateByConversationId(conversationId, {
                conversationTimes: stats.messageCount,
                powerUsed: stats.totalPower,
            });

            console.log(
                `[MindMapExtension] 对话统计信息更新成功: conversationId=${conversationId}, messageCount=${stats.messageCount}, totalTokens=${stats.totalTokens}, totalPower=${stats.totalPower}`,
            );
        } catch (error) {
            // 统计信息更新失败不应该影响主流程，仅记录日志
            this.logger.error(
                `[MindMapExtension] 更新对话统计信息失败: conversationId=${conversationId}, error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    /**
     * 处理未完成的对话消息
     * 在应用启动时调用，将所有处于sending状态删除并更新对话状态
     */
    async handleUnfinishedMessages(): Promise<void> {
        try {
            // 查找所有状态为sending的消息
            const sendingMessages = await this.messageRepository.find({
                where: {
                    status: "sending",
                },
            });

            if (sendingMessages.length > 0) {
                // 先处理需要删除的消息（AI助手的sending消息和对应的用户消息）
                for (const message of sendingMessages) {
                    // 删除对应的用户消息（同一对话中上一条消息）
                    const userMessage = await this.messageRepository.findOne({
                        where: {
                            conversationId: message.conversationId,
                            sequence: message.sequence - 1,
                            role: "user",
                        },
                    });

                    if (userMessage) {
                        await this.messageRepository.delete(userMessage.id);
                        console.log(`[MindMapExtension] 删除用户消息: messageId=${userMessage.id}`);
                    }

                    // 删除AI助手的sending消息
                    await this.messageRepository.delete(message.id);
                    console.log(`[MindMapExtension] 删除AI助手消息: messageId=${message.id}`);
                }

                // 获取这些消息关联的对话ID
                const conversationIds = Array.from(
                    new Set(sendingMessages.map((msg) => msg.conversationId)),
                );

                // 更新对话状态为failed
                await this.conversationRepository.update(
                    { id: In(conversationIds) },
                    {
                        status: ConversationStatus.FAILED,
                    },
                );

                console.log(
                    `[MindMapExtension] 已处理未完成的消息: count=${sendingMessages.length}`,
                );
            } else {
                console.log("[MindMapExtension] 未发现未完成的消息");
            }
        } catch (error) {
            this.logger.error(
                `[MindMapExtension] 处理未完成的消息时出错: error=${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }
}
