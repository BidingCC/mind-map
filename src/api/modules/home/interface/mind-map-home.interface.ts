/**
 * 思维导图首页配置公共接口
 * 用于对外暴露的接口响应结构，不包含敏感字段
 */
export interface MindMapHomePublicInterface {
    /**
     * 插件显示名称
     */
    name: string | null;

    /**
     * 宣传语文案
     */
    publicLanguage: string | null;

    /**
     * 宣传语副标题
     */
    description: string | null;

    /**
     * 是否启用副标题
     */
    enabledDescription: boolean;
}
