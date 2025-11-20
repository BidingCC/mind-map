import { ExtensionWebController } from "@buildingai/core/decorators";
import type { UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Delete, Get, Param, Query } from "@nestjs/common";

import { CreateService } from "../../services/create.service";

/**
 * AI对话记录控制器（前台）
 *
 * 提供用户对话记录的查询和管理功能
 */
@ExtensionWebController("ai-chat-record")
export class AiChatRecordController {
    constructor(private readonly createService: CreateService) {}

    /**
     * 删除对话
     */
    @Delete(":id")
    async deleteConversation(
        @Param("id", UUIDValidationPipe) conversationId: string,
        @Playground() playground: UserPlayground,
    ) {
        await this.createService.deleteUserConversation(conversationId, playground.id);
        return { message: "对话删除成功" };
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

        return await this.createService.getConversationMessagesUser(conversationId, paginationDto);
    }
}
