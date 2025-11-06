import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

/**
 * 保存思维导图名称DTO
 * @description 用于保存思维导图的DTO
 */
export class SaveMindMapDto {
    /**
     * 思维导图ID
     */
    @IsNotEmpty()
    @IsString()
    id: string;

    /**
     * 思维导图描述
     */
    @IsOptional()
    mindMapData: any;

    /**
     * 消耗积分
     */
    @IsOptional()
    @IsNumber()
    powerUsed: number;

    /**
     * 更新时间
     */
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    updatedAt: Date;
}
