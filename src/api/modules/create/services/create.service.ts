import { BaseService } from "@buildingai/base/services/base.service";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { FindManyOptions, In, Not, Repository } from "@buildingai/db/typeorm";
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
        return await this.configService.getConfig();
    }

    /**
     * 保存思维导图记录
     * @param saveMindMapDto 保存思维导图DTO
     * @param userId 当前用户ID
     * @returns 更新后的思维导图记录
     */
    async saveMindMap(saveMindMapDto: SaveMindMapDto, userId?: string): Promise<MindMapRecord> {
        // 如果提供了userId，则验证当前用户是否为记录创建者
        if (userId) {
            const mindMapRecord = await this.mindMapRecordRepository.findOne({
                where: { id: saveMindMapDto.id },
            });

            if (!mindMapRecord) {
                throw HttpErrorFactory.notFound("The mind map record does not exist");
            }

            if (mindMapRecord.userId !== userId) {
                throw HttpErrorFactory.forbidden("No permission to save this record");
            }
        }

        return await this.updateById(saveMindMapDto.id, saveMindMapDto);
    }

    /**
     * 获取思维导图详情
     * @param id 思维导图ID
     * @param userId 当前用户ID
     * @returns 思维导图记录
     */
    async getDetail(id: string, userId: string): Promise<MindMapRecordPublicInterface> {
        const mindMapRecord = await this.mindMapRecordRepository.findOne({
            where: { id },
        });

        if (!mindMapRecord) {
            throw HttpErrorFactory.notFound("The mind map record does not exist");
        }

        // 检查当前用户是否为思维导图的创建者
        if (mindMapRecord.userId !== userId) {
            throw HttpErrorFactory.forbidden("There is no permission to view this mind map");
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
    }

    /**
     * 更新思维导图名称
     * @param id 思维导图ID
     * @param title 新名称
     * @param userId 当前用户ID
     * @returns 更新后的思维导图记录
     */
    async updateTitle(id: string, title: string, userId?: string): Promise<MindMapRecord> {
        // 如果提供了userId，则验证当前用户是否为记录创建者
        if (userId) {
            const mindMapRecord = await this.mindMapRecordRepository.findOne({
                where: { id },
            });

            if (!mindMapRecord) {
                throw HttpErrorFactory.notFound("The mind map record does not exist");
            }

            if (mindMapRecord.userId !== userId) {
                throw HttpErrorFactory.forbidden("No permission to modify this record");
            }
        }

        return await this.updateById(id, { description: title });
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
        const mindMapRecord = await this.mindMapRecordRepository.findOne({
            where: { aiChatRecordId: conversationId },
        });

        if (!mindMapRecord) {
            throw HttpErrorFactory.notFound("The mind map record does not exist");
        }

        return await this.updateById(mindMapRecord.id, updates);
    }

    /**
     * 思维导图记录的积分消耗
     * @param id 思维导图记录ID
     * @param powerUsed 消耗的积分
     * @returns 更新后的思维导图记录
     */
    async addPowerUsed(id: string, powerUsed: number): Promise<MindMapRecord> {
        const mindMapRecord = await this.mindMapRecordRepository.findOne({
            where: { id },
        });

        if (!mindMapRecord) {
            throw HttpErrorFactory.notFound("The mind map record does not exist");
        }

        // 累加积分消耗
        const updatedPowerUsed = mindMapRecord.powerUsed + powerUsed;
        return await this.updateById(id, { powerUsed: updatedPowerUsed });
    }

    // =================== AI对话记录相关方法 ===================
    /**
     * 根据ID获取对话记录
     * @param id 对话记录ID
     * @returns 对话记录
     */
    async findOneConversationById(id: string): Promise<MindMapAiChatRecord | null> {
        return await this.conversationRepository.findOne({
            where: { id },
        });
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
        const conversationData = {
            ...dto,
            userId,
            messageCount: 0,
            totalTokens: 0,
            status: ConversationStatus.ACTIVE,
        };

        try {
            return await this.conversationRepository.save(conversationData);
        } catch (error) {
            this.logger.error(`创建对话失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to create conversation.");
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

            return result;
        } catch (error) {
            this.logger.error(`获取对话详情失败: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to get conversation detail.");
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
            const whereCondition: Partial<MindMapAiChatRecord> = {
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
                throw HttpErrorFactory.notFound("The conversation record does not exist");
            }

            // 更新字段
            Object.assign(record, dto);

            return await this.conversationRepository.save(record);
        } catch (error) {
            this.logger.error(`Failed to update the dialogue: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to update conversation.");
        }
    }

    /**
     * 删除对话
     * @param conversationId 对话ID
     * @param userId 用户ID
     */
    async deleteConversation(conversationId: string): Promise<void> {
        if (!conversationId) {
            return;
        }

        try {
            const queryBuilder = this.conversationRepository
                .createQueryBuilder()
                .delete()
                .from(MindMapAiChatRecord)
                .where("id = :conversationId", { conversationId });

            await queryBuilder.execute();
        } catch (error) {
            this.logger.error(`Failed to delete the conversation: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to delete conversation.");
        }
    }

    /**
     * 前台用户删除对话（带权限验证）
     * @param conversationId 对话ID
     * @param userId 当前用户ID
     */
    async deleteUserConversation(conversationId: string, userId: string): Promise<void> {
        if (!conversationId) {
            throw HttpErrorFactory.badRequest("The conversation ID cannot be empty");
        }

        // 先检查对话是否存在并属于当前用户
        const conversation = await this.conversationRepository.findOne({
            where: {
                id: conversationId,
                userId: userId,
            },
        });

        if (!conversation) {
            throw HttpErrorFactory.notFound(
                "The conversation record does not exist or is not accessible with permission",
            );
        }

        try {
            await this.conversationRepository.delete({
                id: conversationId,
                userId: userId,
            });
        } catch (error) {
            this.logger.error(`Failed to delete the conversation: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to delete the conversation");
        }
    }

    /**
     * 批量删除对话
     * @param ids 对话ID数组
     * @param userId 用户ID
     */
    async batchDeleteConversations(ids: string[]): Promise<void> {
        if (!ids || ids.length === 0) {
            return;
        }

        try {
            const queryBuilder = this.conversationRepository
                .createQueryBuilder()
                .delete()
                .from(MindMapAiChatRecord)
                .where("id IN (:...ids)", { ids });

            await queryBuilder.execute();
        } catch (error) {
            this.logger.error(
                `Batch deletion of conversations failed: ${error.message}`,
                error.stack,
            );
            throw HttpErrorFactory.badRequest("Failed to batch delete conversations.");
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
        } catch (error) {
            this.logger.error(
                `Failed to update the dialogue summary: ${error.message}`,
                error.stack,
            );
            throw HttpErrorFactory.badRequest("Failed to update conversation summary.");
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
        } catch (error) {
            this.logger.error(
                `Failed to update the dialogue status: ${error.message}`,
                error.stack,
            );
            throw HttpErrorFactory.badRequest("Failed to update conversation status.");
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

            const messageData = {
                ...dto,
                modelId: dto.modelId || undefined,
                sequence,
                status: dto.status || "completed",
            };

            const result = await this.messageRepository.save(messageData);

            // 更新对话统计信息
            await this.updateConversationStats(dto.conversationId);

            return result;
        } catch (error) {
            this.logger.error(`Failed to create the message: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to create message.");
        }
    }

    /**
     * 分页查询消息
     * @param paginationDto 分页参数
     * @param queryDto 查询条件
     */
    async findMessages(paginationDto: PaginationDto, queryDto?: { conversationId?: string }) {
        // 构建查询选项
        const options: FindManyOptions<MindMapAiChatMessage> = {
            order: { sequence: "DESC" as const },
            where: { status: Not("failed") },
        };

        if (queryDto?.conversationId) {
            options.where = {
                conversationId: queryDto.conversationId,
                status: Not("failed"),
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
        return {
            items: data,
            total,
            page,
            pageSize,
            totalPages,
        };
    }

    /**
     * 获取对话的消息列表
     * @param conversationId 对话ID
     * @param paginationDto 分页参数
     */
    async getConversationMessages(conversationId: string, paginationDto: PaginationDto) {
        if (!conversationId) {
            throw HttpErrorFactory.notFound("The conversation does not exist.");
        }
        return await this.findMessages(paginationDto, { conversationId });
    }

    /**
     * 获取对话的消息列表(用于前台)
     * @param conversationId 对话ID
     * @param paginationDto 分页参数
     */
    async getConversationMessagesUser(conversationId: string, paginationDto: PaginationDto) {
        if (!conversationId) {
            throw HttpErrorFactory.notFound("The conversation does not exist.");
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
            errorMessage: item.errorMessage,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        }));

        // 返回公共接口数据结构
        return {
            items: publicItems,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            totalPages: result.totalPages,
        };
    }

    /**
     * 更新消息
     * @param messageId 消息ID
     * @param dto 更新数据
     */
    async updateMessage(messageId: string, dto: UpdateMessageDto): Promise<MindMapAiChatMessage> {
        try {
            // 先查找消息
            const message = await this.messageRepository.findOne({
                where: { id: messageId },
            });

            if (!message) {
                throw HttpErrorFactory.notFound("The message does not exist.");
            }

            // 更新字段
            Object.assign(message, dto);
            const result = await this.messageRepository.save(message);

            // 更新对话统计信息
            await this.updateConversationStats(message.conversationId);

            return result;
        } catch (error) {
            this.logger.error(`Message update failed: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to update message.");
        }
    }

    /**
     * 删除消息
     * @param messageId 消息ID
     */
    async deleteMessage(messageId: string): Promise<void> {
        try {
            // 先获取消息信息
            const message = await this.messageRepository.findOne({
                where: { id: messageId },
            });

            if (!message) {
                throw HttpErrorFactory.notFound("Message not found.");
            }

            await this.messageRepository.delete(messageId);

            // 更新对话统计信息
            await this.updateConversationStats(message.conversationId);
        } catch (error) {
            this.logger.error(`Failed to delete the message: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to delete message.");
        }
    }

    /**
     * 删除对话中最后一个用户发送的消息
     * 用于客户端断开连接时保持数据一致性
     * @param conversationId 对话ID
     * @param userId 用户ID
     * @param content 消息内容
     */
    async deleteLastUserMessage(
        conversationId: string,
        userId: string,
        content: string,
    ): Promise<void> {
        try {
            // 查找最后一个匹配的用户消息
            const lastUserMessage = await this.messageRepository.findOne({
                where: {
                    conversationId,
                    role: "user",
                    content,
                },
                order: {
                    sequence: "DESC",
                },
            });

            // 如果找到了消息，则删除它
            if (lastUserMessage) {
                await this.messageRepository.delete(lastUserMessage.id);
                // 更新对话统计信息
                await this.updateConversationStats(conversationId);
            }
        } catch (error) {
            this.logger.error(
                `Failed to delete the message sent by the last user in the conversation: ${error.message}`,
                error.stack,
            );
            throw HttpErrorFactory.badRequest("Failed to delete last user message.");
        }
    }

    /**
     * 根据消息ID删除消息
     * 用于客户端断开连接时快速删除指定消息
     * @param messageId 消息ID
     */
    async deleteMessageById(messageId: string): Promise<void> {
        try {
            await this.messageRepository.delete(messageId);
        } catch (error) {
            this.logger.error(`Failed to delete the message: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to delete message by id.");
        }
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

        return {
            messageCount,
            totalTokens: parseInt(tokenStats.totalTokens) || 0,
            totalPower: parseInt(tokenStats.totalPower) || 0,
        };
    }

    /**
     * 更新消息状态
     * @param messageId 消息ID
     * @param status 消息状态
     */
    async updateMessageStatus(
        messageId: string,
        status: "sending" | "completed" | "failed",
    ): Promise<void> {
        try {
            await this.messageRepository.update(messageId, { status });
        } catch (error) {
            this.logger.error(`Failed to update the message status: ${error.message}`, error.stack);
            throw HttpErrorFactory.badRequest("Failed to update message status.");
        }
    }

    /**
     * 更新处理时长
     * @param messageId 消息ID
     * @param processingTime 处理时长（毫秒）
     */
    async updateProcessingTime(messageId: string, processingTime: number): Promise<void> {
        try {
            await this.messageRepository.update(messageId, { processingTime });
        } catch (error) {
            this.logger.error(
                `The update processing duration failed: ${error.message}`,
                error.stack,
            );
            throw HttpErrorFactory.badRequest("Failed to update processing time.");
        }
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
        } catch (error) {
            // 统计信息更新失败不应该影响主流程，仅记录日志
            console.error("Failed to update the dialogue statistics:", error);
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
                        this.logger.debug(
                            `User messages in unfinished conversations have been deleted: ${userMessage.id}`,
                        );
                    }

                    // 删除AI助手的sending消息
                    await this.messageRepository.delete(message.id);
                    this.logger.debug(
                        `The AI message in the unfinished conversation has been deleted: ${message.id}`,
                    );
                }

                // 获取这些消息关联的对话ID
                const conversationIds = [
                    ...new Set(sendingMessages.map((msg) => msg.conversationId)),
                ];

                // 更新对话状态为failed
                await this.conversationRepository.update(
                    { id: In(conversationIds) },
                    {
                        status: ConversationStatus.FAILED,
                    },
                );

                console.log(
                    `[MindMapExtension] has processed ${sendingMessages.length} of unfinished messages`,
                );
            }
        } catch (error) {
            console.error(
                "[MindMapExtension] Error occurred when processing unfinished messages:",
                error,
            );
        }
    }
}
