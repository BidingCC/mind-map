import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * 创建思维导图DTO
 */
export class CreateMindMapDto {
    /**
     * 用户ID
     */
    @IsNotEmpty()
    @IsString()
    userId: string;

    /**
     * 画板名称
     */
    @Transform(({ value }) => value || "未命名导图")
    @IsOptional()
    @IsString()
    description: string;

    /**
     * 结构类型
     */
    @IsOptional()
    @IsString()
    type: string;

    /**
     * 算力消耗
     */
    @Transform(({ value }) => value || 0)
    @IsNotEmpty()
    @IsInt()
    powerUsed: number;
}
