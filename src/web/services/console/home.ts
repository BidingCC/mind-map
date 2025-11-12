/**
 * 思维导图首页配置服务
 * @description 提供后台思维导图首页配置相关的API调用服务
 */

import type { MindMapHomeConfig } from "../../models/record";

/**
 * 获取思维导图首页配置
 * @returns 思维导图首页配置
 */
export const apiGetMindMapHomeConfig = (): Promise<MindMapHomeConfig> => {
    return usePluginConsoleGet("/home/config");
};

/**
 * 保存思维导图首页配置
 * @param data 配置数据
 * @returns 保存结果
 */
export const apiSaveMindMapHomeConfig = (data: MindMapHomeConfig) => {
    return usePluginConsolePost("/home/save", data);
};
