/**
 * 思维导图示例配置响应 DTO
 */
export interface MindMapExampleResponse {
    /**
     * 开场白
     */
    prologue: string;

    /**
     * 试一试选项列表
     */
    try: any[];

    /**
     * 对话框文字
     */
    dialogText: string;

    /**
     * 是否启用试一试功能
     */
    enabledTry: boolean;

    /**
     * 是否启用对话框
     */
    enabledDialog: boolean;
}
