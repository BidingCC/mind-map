/**
 * 思维导图创建编辑服务
 * @description 思维导图创建编辑页面相关的API调用服务
 */
import type { MindMapExampleConfig, SaveMindMapDto } from "../../models/record";

/**
 * 获取思维导图记录详情
 * @param id 思维导图记录ID
 * @returns 思维导图记录详情
 */
export const apiGetMindMapDetailUser = (id: string) => {
    return usePluginWebGet(`/create/getDetail/${id}`);
};

/**
 * 修改思维导图名称
 * @param id 思维导图ID
 * @param title 新的思维导图名称
 * @returns 更新后的思维导图
 */
export const apiUpdateMindMapTitle = (id: string, title: string) => {
    return usePluginWebPatch(`/create/update-title/${id}`, { title });
};

/**
 * 保存思维导图
 * @param data 保存思维导图参数
 * @returns 保存结果
 */
export const apiSaveMindMap = (data: SaveMindMapDto) => {
    return usePluginWebPatch("/create/save", data);
};

/**
 * 获取对话消息
 * @returns 对话消息
 */
export const apiGetAiMessage = (id: string | undefined) => {
    return usePluginWebGet(`/ai-chat-record/${id}`);
};

/**
 * 获取思维导图示例配置（前台用户使用）
 * @returns 思维导图示例配置
 */
export const apiGetMindMapExamplesUser = () => {
    return usePluginWebGet("/examples") as Promise<MindMapExampleConfig>;
};
