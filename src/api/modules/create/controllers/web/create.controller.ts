import { ExtensionWebController } from "@buildingai/core/decorators";
import { BaseController } from "@buildingai/core/modules/base/controllers/base.controller";
import { Body, Get, Param, Patch } from "@nestjs/common";

import { SaveMindMapDto } from "../../dto/save-mind-map.dto";
import { UpdateTitleDto } from "../../dto/update-title.dto";
import { CreateService } from "../../services/create.service";

@ExtensionWebController("create")
export class CreateController extends BaseController {
    constructor(private readonly createService: CreateService) {
        super();
    }

    /**
     * 获取思维导图详情
     * @param createMindMapDto 创建思维导图DTO
     * @returns 创建的思维导图记录
     */
    @Get("getDetail/:id")
    async getMindMapDetail(@Param("id") id: string) {
        return await this.createService.getDetail(id);
    }

    /**
     * 修改思维导图名称
     * @param id 思维导图ID
     * @returns 是否成功
     */
    @Patch("update-title/:id")
    async updateMindMapTitle(@Param("id") id: string, @Body() updateTitleDto: UpdateTitleDto) {
        return await this.createService.updateTitle(id, updateTitleDto.title);
    }

    /**
     * 保存思维导图
     * @param id 思维导图ID
     * @returns 是否成功
     */
    @Patch("save")
    async saveMindMap(@Body() saveMindMapDto: SaveMindMapDto) {
        return await this.createService.saveMindMap(saveMindMapDto);
    }
}
