import { BaseController } from "@buildingai/base/controllers/base.controller";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import type { UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { PaginationDto } from "@buildingai/dto/pagination.dto";
import { HttpErrorFactory } from "@buildingai/errors";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Get, Param, Query } from "@nestjs/common";

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
