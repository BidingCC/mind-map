import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

/**
 * 分页DTO
 * @description 用于分页查询的基础DTO
 */
export class PaginationDto {
    /**
     * 页码
     * @description 默认为1
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    /**
     * 每页数量
     * @description 默认为10
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    pageSize?: number = 10;
}
