import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Query } from "@nestjs/common";

import { CreateService } from "../../services/create.service";

/**
 * AI对话记录控制器（前台）
 *
 * 提供用户对话记录的查询和管理功能
 */
@ExtensionConsoleController("ai-chat-record", "AI对话记录")
export class AiChatRecordConsoleController {
    constructor(private readonly createService: CreateService) {}

    /**
     * 获取对话详情（包含消息）
     */
    @Get(":id")
    async getConversationDetail(
        @Param("id", UUIDValidationPipe) conversationId: string | undefined,
        @Query("userId") userId: string,
    ) {
        return await this.createService.getConversationWithMessages(conversationId, userId);
    }

    /**
     * 获取对话的消息列表
     */
    @Get(":id/messages")
    async getConversationMessages(
        @Param("id", UUIDValidationPipe) conversationId: string,
        @Query() paginationDto: PaginationDto,
    ) {
        return await this.createService.getConversationMessages(conversationId, paginationDto);
    }

    /**
     * 批量删除对话
     * @param ids 对话ID数组
     * @returns 是否成功
     */
    @Delete()
    async deleteConversations(@Body() ids: string[]) {
        return await this.createService.batchDeleteConversations(ids);
    }

    /**
     * 删除对话
     */
    @Delete(":id")
    async deleteConversation(@Param("id", UUIDValidationPipe) conversationId: string) {
        await this.createService.deleteConversation(conversationId);
    }
}
