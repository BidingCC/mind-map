import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from "class-validator";

/**
 * 示例项 DTO
 * @description 用于验证示例项的结构
 */
export class TryItemDto {
    /**
     * 示例ID
     */
    @IsOptional()
    @IsString({ message: "示例ID必须是字符串" })
    id?: string;

    /**
     * 示例内容
     */
    @IsString({ message: "示例内容必须是字符串" })
    @MaxLength(35, { message: "示例内容不能超过35个字符" })
    content: string;
}

/**
 * 保存示例配置 DTO
 * @description 用于保存思维导图示例配置的参数验证
 */
export class SaveExamplesConfigDto {
    /**
     * 开场白
     */
    @IsOptional()
    @IsString({ message: "开场白必须是字符串" })
    prologue?: string;

    /**
     * 对话框文字
     */
    @IsOptional()
    @IsString({ message: "对话框文字必须是字符串" })
    @MaxLength(20, { message: "对话框文字不能超过20个字符" })
    dialogText?: string;

    /**
     * 试一试示例列表
     */
    @IsOptional()
    @IsArray({ message: "试一试必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => TryItemDto)
    try?: TryItemDto[];

    /**
     * 是否启用试一试
     */
    @IsOptional()
    @IsBoolean({ message: "是否启用试一试必须是布尔值" })
    enabledTry?: boolean;

    /**
     * 是否启用对话框文字
     */
    @IsOptional()
    @IsBoolean({ message: "是否启用对话框文字必须是布尔值" })
    enabledDialog?: boolean;
}
