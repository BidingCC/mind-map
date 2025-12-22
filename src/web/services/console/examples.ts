/**
 * 思维导图实例配置服务
 * @description 提供后台思维导图实例配置相关的API调用服务
 */
import type { MindMapExampleConfig } from "../types/record";

/**
 * 获取思维导图示例配置
 * @returns 思维导图示例配置
 */
export const apiGetMindMapExamples = () => {
    return usePluginConsoleGet("/examples") as Promise<MindMapExampleConfig>;
};

/**
 * 保存思维导图示例配置
 * @param data 配置数据
 * @returns 保存是否成功（布尔值）
 */
export const apiSaveMindMapExamples = (data: MindMapExampleConfig) => {
    return usePluginConsolePost<boolean>("/examples/save", data);
};
