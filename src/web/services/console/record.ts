/**
 * 思维导图管理服务
 * @description 提供后台思维导图管理相关的API调用服务
 */
import type { MindMapListResponse, SearchMindMapRecordDto } from "../../models/record";

/**
 * 获取思维导图记录详情（后台管理）
 * @param id 思维导图记录ID
 * @returns 思维导图记录详情
 */
export const apiGetMindMapDetailConsole = (id: string) => {
    return usePluginConsoleGet(`/record/${id}`);
};

/**
 * 删除思维导图记录（后台管理）
 * @param id 思维导图记录ID
 * @returns 删除结果
 */
export const apiDeleteMindMapConsole = (id: string) => {
    return usePluginConsoleDelete(`/record/delete/${id}`);
};

/**
 * 批量删除思维导图（后台管理）
 * @param ids 思维导图ID列表
 * @returns 删除结果
 */
export const apiBatchDeleteMindMapConsole = (ids: string[]) => {
    return usePluginConsoleDelete("/record/delete", { ids });
};

/**
 * 搜索思维导图记录（后台管理）
 * @param params 搜索参数
 * @returns 分页思维导图记录列表
 */
export const apiSearchMindMapRecordsConsole = (
    params: SearchMindMapRecordDto,
): Promise<MindMapListResponse> => {
    return usePluginConsoleGet("/record", params);
};
