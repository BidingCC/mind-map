import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/**
 * 编辑思维导图名称DTO
 * @description 用于修改思维导图名称的基础DTO
 */
export class UpdateTitleDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    title: string;
}
