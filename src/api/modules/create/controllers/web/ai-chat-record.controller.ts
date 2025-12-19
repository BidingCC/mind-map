import { ExtensionWebController } from "@buildingai/core/decorators";
import type { UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
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
        return await this.createService.deleteUserConversation(conversationId, playground.id);
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
        return await this.createService.getConversationMessagesUser(
            conversationId,
            paginationDto,
            playground.id,
        );
    }
}
