import type { Pagination, PaginationResult } from "@buildingai/service/models/globals";
import type { AiMessage } from "@buildingai/service/models/message";
import type { ChatStreamConfig } from "@buildingai/types";

/**
 * 删除记录
 * @param id 记录ID
 * @returns 删除结果
 */
export function apiDeleteAiConversation(id: string): Promise<boolean> {
    return usePluginWebDelete(`/ai-chat-record/${id}`);
}

/**
 * 开始流式对话
 * @param messages 消息列表
 * @param config 流配置
 * @returns 流控制器
 */
export function apiChatStream(
    messages: AiMessage[],
    config?: Partial<ChatStreamConfig>,
): Promise<{ abort: () => void }> {
    return usePluginWebStream("/ai-chat-message/chat-stream", { ...config, messages });
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
    return usePluginWebGet(`/ai-chat-record/${id}/messages`, params);
}
