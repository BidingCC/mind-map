import { Type } from "class-transformer";
import { IsDate, IsOptional, IsString } from "class-validator";

import { PaginationDto } from "./pagination.dto";

/**
 * 搜索思维导图记录DTO
 * @description 用于搜索思维导图记录的DTO
 */
export class SearchMindMapRecordDto extends PaginationDto {
    /**
     * 用户标识符（可以是用户ID或用户名）
     */
    @IsOptional()
    @IsString()
    userIdentifier?: string;

    /**
     * 思维导图描述
     */
    @IsOptional()
    @IsString()
    description?: string;

    /**
     * 开始日期
     */
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    startDate?: Date;

    /**
     * 结束日期
     */
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    endDate?: Date;
}