import { BaseController } from "@buildingai/base/controllers/base.controller";
import { ExtensionWebController } from "@buildingai/core/decorators";
import type { UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateAIChatRecordDto, UpdateAIChatRecordDto } from "../../dto/ai-chat-record.dto";
import { CreateService } from "../../services/create.service";

/**
 * AI对话记录控制器（前台）
 *
 * 提供用户对话记录的查询和管理功能
 */
@ExtensionWebController("ai-chat-record")
export class AiChatRecordController extends BaseController {
    constructor(private readonly createService: CreateService) {
        super();
    }

    /**
     * 创建新对话
     */
    @Post()
    async createConversation(
        @Body() dto: CreateAIChatRecordDto,
        @Playground() playground: UserPlayground,
    ) {
        return await this.createService.createConversation(playground.id, dto);
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
     * 更新对话信息
     */
    @Patch(":id")
    async updateConversation(
        @Param("id", UUIDValidationPipe) conversationId: string,
        @Body() dto: UpdateAIChatRecordDto,
        @Playground() playground: UserPlayground,
    ) {
        return await this.createService.updateConversation(conversationId, playground.id, dto);
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
     * 获取对话的消息列表
     */
    @Get(":id/messages")
    async getConversationMessages(
        @Param("id", UUIDValidationPipe) conversationId: string,
        @Query() paginationDto: PaginationDto,
        @Playground() playground: UserPlayground,
    ) {
        // 先检查对话是否属于当前用户
        const conversation = await this.createService.getConversationWithMessages(
            conversationId,
            playground.id,
        );

        if (!conversation) {
            throw HttpErrorFactory.badRequest(
                "The conversation does not exist or is not accessible",
            );
        }

        return await this.createService.getConversationMessages(conversationId, paginationDto);
    }
}
