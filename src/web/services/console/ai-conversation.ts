import type { Pagination, PaginationResult } from "@buildingai/service/models/globals";
import type { AiMessage } from "@buildingai/service/models/message";
import type { AiConversation } from "@buildingai/service/webapi/ai-conversation";

/**
 * 获取对话详情
 * @param id 对话ID
 * @returns 对话详情
 */
export function apiGetAiConversationDetail(id: string | undefined): Promise<AiConversation> {
    return usePluginConsoleGet(`/ai-chat-record/${id}`);
}

/**
 * 获取对话的消息记录（分页）
 * @param id 对话ID
 * @param params 分页信息
 * @returns 消息记录分页结果
 */
export function apiGetAiConversation(
    id: string,
    params: Pagination,
): Promise<PaginationResult<AiMessage>> {
    return usePluginConsoleGet(`/ai-chat-record/${id}/messages`, params);
}
