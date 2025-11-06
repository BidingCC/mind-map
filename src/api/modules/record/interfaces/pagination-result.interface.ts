/**
 * 分页查询结果接口
 * @description 用于返回分页查询结果
 */
export interface PaginationResult<T> {
    /**
     * 数据列表
     */
    items: T[];

    /**
     * 总数
     */
    total: number;

    /**
     * 当前页码
     */
    page: number;

    /**
     * 每页数量
     */
    pageSize: number;

    /**
     * 总页数
     */
    totalPages: number;
}
