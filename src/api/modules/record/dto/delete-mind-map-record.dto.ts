import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";

/**
 * 批量删除思维导图记录DTO
 */
export class BatchDeleteMindMapRecordDto {
    /**
     * 思维导图记录ID列表
     */
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID("all", { each: true })
    ids: string[];
}
