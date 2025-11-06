/**
 * 思维导图相关类型定义
 */

/**
 * 搜索思维导图记录DTO
 */
export interface SearchMindMapRecordDto {
    /** 用户名 */
    username?: string;
    /** 输出状态 */
    userId?: string;
    /** 思维导图描述 */
    description?: string;
    /** 开始日期 */
    startDate?: string;
    /** 结束日期 */
    endDate?: string;
    /** 当前页码 */
    page?: number;
    /** 每页大小 */
    pageSize?: number;
}

/**
 * 思维导图记录实体接口
 */
export interface MindMapRecord {
    /** 主键ID */
    id: string;
    /** 用户ID */
    userId: string;
    /** 用户名称 */
    userName: string;
    /** 用户头像 */
    userAvatar?: string;
    /** 思维导图描述 */
    description: string;
    /** 生成时间 */
    createdAt: Date;
    /** 思维导图数据 */
    mindMapData: any;
    /** 消耗积分 */
    powerUsed: number;
    /** 对话次数 */
    conversationTimes: number;
    /** 关联的AI对话记录ID */
    aiChatRecordId?: string;
    /** 更新时间 */
    updatedAt: Date;
}

/**
 * 创建思维导图请求参数
 */
export interface CreateMindMapDto {
    /** 用户ID */
    userId: string;
    /** 思维导图描述 */
    description: string;
    /** 思维导图类型 */
    type: string;
    /** 消耗积分 */
    powerUsed: number;
}

/**
 * 思维导图记录列表查询参数
 */
export interface MindMapListParams {
    /** 页码 */
    page?: number;
    /** 每页条数 */
    pageSize?: number;
}

/**
 * 思维导图记录列表响应
 */
export interface MindMapListResponse {
    /** 记录列表 */
    items: MindMapRecord[];
    /** 总记录数 */
    total: number;
    /** 当前页码 */
    page: number;
    /** 每页条数 */
    pageSize: number;
}

/**
 * 保存思维导图参数
 */
export interface SaveMindMapDto {
    /** 主键ID */
    id: string;
    /** 思维导图数据 */
    mindMapData?: any;
    /** 消耗积分 */
    powerUsed?: number;
    /** 更新时间 */
    updatedAt?: Date;
}

/**
 * 思维导图插件配置数据接口
 */
export interface MindMapConfig {
    /** 配置ID */
    id: string;
    /** 绑定的密钥配置ID */
    // bindKeyConfigId: string;
    /** 绑定的模型名称 */
    bindModel?: string;
    /** 绑定的模型ID */
    bindModelId?: string;
    /** 计费类型 1-按次数 2-免费 3-按字数 */
    billingType: number;
    /** 计费设置 */
    billingSetting: number;
    /** 创建时间 */
    createdAt: string;
    /** 更新时间 */
    updatedAt: string;
}

/**
 * 思维导图示例配置接口
 */
export interface MindMapExampleConfig {
    /** 插件显示名称 */
    name: string;
    /** 宣传语文案 */
    publicLanguage: string;
    /** 宣传语副标题 */
    description: string;
    /** 是否启用副标题 */
    enabledDescription: boolean;
    /** 开场白 */
    prologue: string;
    /** 对话框文字 */
    dialogText: string;
    /** 试一试选项列表 */
    try: Array<{ id: string; content: string }>;
    /** 是否启用试一试 */
    enabledTry: boolean;
    /** 是否启用对话框文字 */
    enabledDialog: boolean;
}
