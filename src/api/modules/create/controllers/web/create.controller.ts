import { BaseController } from "@buildingai/base/controllers/base.controller";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { type UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Get, Param, Patch } from "@nestjs/common";

import { SaveMindMapDto } from "../../dto/save-mind-map.dto";
import { UpdateTitleDto } from "../../dto/update-title.dto";
import { MindMapRecordPublicInterface } from "../../interfaces/mind-map-record.interface";
import { CreateService } from "../../services/create.service";
@ExtensionWebController("create")
export class CreateController extends BaseController {
    constructor(private readonly createService: CreateService) {
        super();
    }

    /**
     * 获取思维导图详情
     * @param id 思维导图ID
     * @param user 当前用户
     * @returns 思维导图记录
     */
    @Get("getDetail/:id")
    async getMindMapDetail(
        @Param("id", UUIDValidationPipe) id: string,
        @Playground() user: UserPlayground,
    ): Promise<MindMapRecordPublicInterface> {
        return await this.createService.getDetail(id, user.id);
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
