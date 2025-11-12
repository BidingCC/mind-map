/**
 * 思维导图插件配置服务
 * @description 提供后台思维导图插件配置相关的API调用服务
 */

import type { MindMapConfig } from "../../models/record";

/**
 * 获取思维导图插件配置
 * @returns 思维导图插件配置
 */
export const apiGetMindMapConfig = (): Promise<MindMapConfig> => {
    return usePluginConsoleGet("/config/plugin");
};

/**
 * 保存思维导图插件配置
 * @param id 配置ID
 * @param data 配置数据
 * @returns 保存结果
 */
export const apiSaveMindMapConfig = (data: MindMapConfig, id?: string) => {
    return usePluginConsolePost(`/config/save-plugin/${id}`, data);
};
