/**
 * 思维导图记录公共接口
 * 用于对外暴露的接口响应结构，不包含敏感字段
 */
export interface MindMapRecordPublicInterface {
    /**
     * 记录ID
     */
    id: string;

    /**
     * 创建时间
     */
    createdAt: Date;

    /**
     * 描述信息
     */
    description: string;

    /**
     * 思维导图数据
     */
    mindMapData: any | null;

    /**
     * 更新时间
     */
    updatedAt: Date;

    /**
     * AI聊天记录ID
     */
    aiChatRecordId?: string | null;
}
