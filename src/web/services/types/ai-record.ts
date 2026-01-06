/**
 * AI对话记录接口
 * 对应后端 MindMapAiChatRecord 实体
 */
export interface AiChatRecord {
    /**
     * 主键ID (UUID)
     */
    id: string;
    /**
     * 对话标题
     */
    title: string | null;
    /**
     * 用户ID
     */
    userId: string;
    /**
     * 关联的思维导图ID
     */
    mindMapId?: string | null;
    /**
     * AI模型ID
     */
    modelId?: string | null;
    /**
     * 对话摘要
     */
    summary?: string | null;
    /**
     * 消息总数
     */
    messageCount: number;
    /**
     * 总Token消耗
     */
    totalTokens: number;
    /**
     * 总Power消耗
     */
    totalPower: number;
    /**
     * 对话状态
     * active-进行中, completed-已完成, failed-失败
     */
    status: "active" | "completed" | "failed";
    /**
     * 是否删除（软删除）
     */
    isDeleted: boolean;
    /**
     * 扩展数据
     */
    metadata?: Record<string, any> | null;
    /**
     * 创建时间
     */
    createdAt: string;
    /**
     * 更新时间
     */
    updatedAt: string;
}
