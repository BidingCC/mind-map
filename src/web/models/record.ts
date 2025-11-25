/**
 * 思维导图相关类型定义
 */

/**
 * 思维导图节点数据接口
 */
export interface MindMapDataNode {
    /** 节点数据 */
    data: {
        /** 节点文本 */
        text: string;
        /** 节点唯一标识 */
        uid?: string;
        /** 是否展开 */
        expand?: boolean;
        /** 是否激活 */
        isActive?: boolean;
        /** 边框颜色 */
        borderColor?: string;
        /** 填充颜色 */
        fillColor?: string;
        /** 文本颜色 */
        color?: string;
        /** 字体族 */
        fontFamily?: string;
        /** 字体大小 */
        fontSize?: number;
        /** 其他可能的节点属性 */
        [key: string]: any;
    };
    /** 子节点列表 */
    children: MindMapDataNode[];
    /** 版本信息 */
    smmVersion?: string;
}

/**
 * 思维导图主题配置接口
 */
export interface MindMapTheme {
    /** 模板名称 */
    template: string;
    /** 配置详情 */
    config: {
        /** 背景颜色 */
        backgroundColor: string;
        /** 连线颜色 */
        lineColor: string;
        /** 连线样式 */
        lineStyle: string;
        /** 连线宽度 */
        lineWidth: number;
        /** 根节点配置 */
        root: {
            /** 填充颜色 */
            fillColor: string;
        };
        /** 二级节点配置 */
        second: {
            /** 边框颜色 */
            borderColor: string;
        };
        /** 其他可能的主题配置 */
        [key: string]: any;
    };
}

/**
 * 思维导图视图变换接口
 */
export interface MindMapViewTransform {
    /** X轴缩放 */
    scaleX: number;
    /** Y轴缩放 */
    scaleY: number;
    /** 剪切 */
    shear: number;
    /** 旋转 */
    rotate: number;
    /** X轴平移 */
    translateX: number;
    /** Y轴平移 */
    translateY: number;
    /** 原点X坐标 */
    originX: number;
    /** 原点Y坐标 */
    originY: number;
    /** 矩阵参数a */
    a: number;
    /** 矩阵参数b */
    b: number;
    /** 矩阵参数c */
    c: number;
    /** 矩阵参数d */
    d: number;
    /** 矩阵参数e */
    e: number;
    /** 矩阵参数f */
    f: number;
}

/**
 * 思维导图视图状态接口
 */
export interface MindMapViewState {
    /** 缩放比例 */
    scale: number;
    /** X坐标 */
    x: number;
    /** Y坐标 */
    y: number;
    /** 起始X坐标 */
    sx: number;
    /** 起始Y坐标 */
    sy: number;
}

/**
 * 思维导图视图接口
 */
export interface MindMapView {
    /** 变换信息 */
    transform: MindMapViewTransform;
    /** 状态信息 */
    state: MindMapViewState;
}

/**
 * 思维导图布局类型
 */
export type MindMapLayout =
    | "logicalStructure"
    | "mindMap"
    | "organizationStructure"
    | "catalogOrganization"
    | "timeline"
    | "timeline2"
    | "fishbone"
    | "verticalTimeline"
    | string;

/**
 * 思维导图数据完整接口
 */
export interface MindMapData {
    /** 布局类型 */
    layout?: MindMapLayout;
    /** 根节点数据 */
    root: MindMapDataNode;
    /** 主题配置 */
    theme?: MindMapTheme;
    /** 视图信息 */
    view?: MindMapView;
}

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
    /** 思维导图描述 */
    description: string;
    /** 生成时间 */
    createdAt: string | Date;
    /** 思维导图数据 */
    mindMapData: MindMapData;
    /** 消耗积分 */
    powerUsed: number;
    /** 对话次数 */
    conversationTimes: number;
    /** 关联的AI对话记录ID */
    aiChatRecordId?: string;
    /** 更新时间 */
    updatedAt: string | Date;
    /** 用户头像 */
    avatar?: string;
    /** 用户名 */
    username?: string;
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
    mindMapData?: MindMapData;
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
    id?: string;
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
    createdAt?: string;
    /** 更新时间 */
    updatedAt?: string;
}

/**
 * 思维导图示例配置接口
 */
export interface MindMapExampleConfig {
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

/**
 * 思维导图首页配置接口
 */
export interface MindMapHomeConfig {
    /** 插件显示名称 */
    name: string;
    /** 宣传语文案 */
    publicLanguage: string;
    /** 宣传语副标题 */
    description: string;
    /** 是否启用副标题 */
    enabledDescription: boolean;
}
