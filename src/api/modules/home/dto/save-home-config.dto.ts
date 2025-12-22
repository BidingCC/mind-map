import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * 保存首页配置 DTO
 * @description 用于保存思维导图首页配置的参数验证
 */
export class SaveHomeConfigDto {
    /**
     * 插件显示名称
     */
    @IsOptional()
    @IsString({ message: "插件显示名称必须是字符串" })
    @MaxLength(15, { message: "插件显示名称不能超过15个字符" })
    name?: string;

    /**
     * 宣传语文案
     */
    @IsOptional()
    @IsString({ message: "宣传语文案必须是字符串" })
    publicLanguage?: string;

    /**
     * 宣传语副标题
     */
    @IsOptional()
    @IsString({ message: "宣传语副标题必须是字符串" })
    @MaxLength(25, { message: "宣传语副标题不能超过25个字符" })
    description?: string;

    /**
     * 是否启用副标题
     */
    @IsOptional()
    @IsBoolean({ message: "是否启用副标题必须是布尔值" })
    enabledDescription?: boolean;
}
