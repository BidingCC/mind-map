/**
 * 思维导图首页配置服务
 * @description 提供后台思维导图首页配置相关的API调用服务
 */

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

/**
 * 获取思维导图首页配置
 * @returns 思维导图首页配置
 */
export const apiGetMindMapHomeConfig = () => {
    return usePluginConsoleGet("/home/config") as Promise<MindMapHomeConfig>;
};

/**
 * 保存思维导图首页配置
 * @param data 配置数据
 * @returns 保存结果
 */
export const apiSaveMindMapHomeConfig = (data: any) => {
    return usePluginConsolePost("/home/save", data);
};
