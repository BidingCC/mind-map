import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Query } from "@nestjs/common";

import { MindMapRecord } from "../../../../db/entities/mind-map-record.entity";
import { BatchDeleteMindMapRecordDto } from "../../dto/delete-mind-map-record.dto";
import { SearchMindMapRecordDto } from "../../dto/search-mind-map-record.dto";
import { PaginationResult } from "../../interfaces/pagination-result.interface";
import { RecordService } from "../../services/record.service";
@ExtensionConsoleController("record", "思维导图管理")
export class RecordController {
    constructor(private readonly recordService: RecordService) {}

    /**
     * 删除思维导图记录
     * @param id 思维导图记录ID
     * @returns 是否成功
     */
    @Delete("delete/:id")
    async deleteMindMapRecord(@Param("id", UUIDValidationPipe) id: string) {
        return await this.recordService.delete(id);
    }

    /**
     * 批量删除思维导图记录
     * @param dto 批量删除DTO
     * @returns 是否成功
     */
    @Delete("delete")
    async deleteMindMapRecords(@Body() dto: BatchDeleteMindMapRecordDto) {
        return await this.recordService.deleteBatch(dto);
    }

    /**
     * 搜索思维导图记录
     * @param searchDto 搜索DTO
     * @returns 分页思维导图记录列表
     */
    @Get()
    @BuildFileUrl(["**.avatar"])
    async searchMindMapRecords(
        @Query() searchDto: SearchMindMapRecordDto,
    ): Promise<PaginationResult<MindMapRecord>> {
        return await this.recordService.search(searchDto);
    }
}
