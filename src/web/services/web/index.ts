/**
 * 思维导图首页服务
 * @description 思维导图首页相关的API调用服务
 */

import type { Pagination } from "@buildingai/service/models/globals";

import type { CreateMindMapDto, MindMapRecord } from "../../models/record";
import type { MindMapHomeConfig } from "../console/home";

/**
 * 获取思维导图记录列表
 * @param params 查询参数
 * @returns 分页思维导图记录列表
 */
export const apiGetMindMapList = async (params?: Pagination) => {
    // 构建查询参数对象
    const queryParams: any = {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
    };

    // 直接将查询参数作为 URL 查询参数传递
    const response = await usePluginWebGet("/index/list", queryParams);

    // 如果后端返回[data, total]数组格式，则处理
    if (Array.isArray(response) && response.length === 2) {
        const [dataList, total] = response;
        console.log("dataList", dataList);
        console.log("total", total);

        return {
            items: dataList || [],
            total: total || 0,
            page: queryParams.page,
            pageSize: queryParams.pageSize,
        };
    }

    // 如果后端返回标准格式，直接返回
    return response;
};

/**
 * 获取思维导图记录详情
 * @param id 思维导图记录ID
 * @returns 思维导图记录详情
 */
export const apiGetMindMapDetail = (id: string) => {
    return usePluginWebGet(`/index/${id}`);
};

/**
 * 删除思维导图记录
 * @param id 思维导图记录ID
 * @returns 删除结果
 */
export const apiDeleteMindMap = (id: string) => {
    return usePluginWebDelete(`/index/delete/${id}`);
};

/**
 * 创建思维导图
 * @param data 创建思维导图参数
 * @returns 创建结果
 */
export const apiCreateMindMap = (data: CreateMindMapDto) => {
    return usePluginWebPost("/index/add", data) as Promise<MindMapRecord>;
};

/**
 * 修改思维导图名称
 * @param id 思维导图ID
 * @param title 新的思维导图名称
 * @returns 更新后的思维导图
 */
export const apiUpdateMindMapTitle = (id: string, title: string) => {
    return usePluginWebPatch(`/index/update-title/${id}`, { title });
};

/**
 * 获取思维导图首页配置（前台用户使用）
 * @returns 思维导图首页配置
 */
export const apiGetMindMapHomeConfigUser = () => {
    return usePluginWebGet("/home/config") as Promise<MindMapHomeConfig>;
};

/**
 * 获取思维导图插件配置（前台用户使用）
 * @returns 思维导图插件配置
 */
export function apiGetMindMapConfigUser() {
    return usePluginWebGet("/config/plugin-user");
}
