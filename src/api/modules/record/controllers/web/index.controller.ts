import { BaseController } from "@buildingai/base/controllers/base.controller";
import { ExtensionWebController } from "@buildingai/core/decorators";
import type { UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateMindMapDto } from "../../dto/create-mind-map.dto";
import { PaginationDto } from "../../dto/pagination.dto";
import { UpdateTitleDto } from "../../dto/update-title.dto";
import { RecordService } from "../../services/record.service";

@ExtensionWebController("index")
export class IndexController extends BaseController {
    constructor(private readonly indexService: RecordService) {
        super();
    }
    /**
     * 创建思维导图记录
     * @param createMindMapDto 创建思维导图DTO
     * @returns 创建的思维导图记录
     */
    @Post("add")
    async addMindMapRecord(
        @Body() createMindMapDto: CreateMindMapDto,
        @Playground() user: UserPlayground,
    ) {
        return await this.indexService.createMindMap(createMindMapDto, user);
    }

    /**
     * 获取思维导图记录列表
     * @param listDto 列表DTO
     * @returns 分页思维导图记录列表
     */
    @Get("list")
    async getMindMapRecordList(@Query() listDto: PaginationDto) {
        return await this.indexService.list(listDto);
    }

    /**
     * 删除思维导图记录
     * @param id 思维导图ID
     * @returns 是否成功
     */
    @Delete("delete/:id")
    async deleteMindMapRecord(@Param("id", UUIDValidationPipe) id: string) {
        return await this.indexService.deleteUser(id);
    }

    /**
     * 修改思维导图名称
     * @param id 思维导图ID
     * @returns 是否成功
     */
    @Patch("update-title/:id")
    async updateMindMapTitle(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() updateTitleDto: UpdateTitleDto,
    ) {
        return await this.indexService.updateTitle(id, updateTitleDto.title);
    }
}
