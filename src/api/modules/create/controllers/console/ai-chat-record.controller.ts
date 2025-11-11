import { BaseController } from "@buildingai/base/controllers/base.controller";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import type { UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { Playground } from "@buildingai/decorators/playground.decorator";
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
export class AiChatRecordConsoleController extends BaseController {
    constructor(private readonly createService: CreateService) {
        super();
    }

    /**
     * 获取对话详情（包含消息）
     */
    @Get(":id")
    async getConversationDetail(
        @Param("id", UUIDValidationPipe) conversationId: string | undefined,
        @Playground() user: UserPlayground,
    ) {
        return await this.createService.getConversationWithMessages(conversationId, user.id);
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
    async deleteConversations(@Body() ids: string[], @Playground() playground: UserPlayground) {
        return await this.createService.batchDeleteConversations(ids, playground.id);
    }

    /**
     * 删除对话
     */
    @Delete(":id")
    async deleteConversation(
        @Param("id", UUIDValidationPipe) conversationId: string,
        @Playground() playground: UserPlayground,
    ) {
        await this.createService.deleteConversation(conversationId, playground.id);
        return { message: "对话删除成功" };
    }
}
