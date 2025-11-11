import { BaseController } from "@buildingai/base/controllers/base.controller";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { Body, Get, Post } from "@nestjs/common";

import { MindMapExample } from "../../../../db/entities/mind-map-example.entity";
import { ExamplesService } from "../../services/examples.service";

@ExtensionConsoleController("examples", "思维导图示例")
export class ExamplesConsoleController extends BaseController {
    constructor(private readonly examplesService: ExamplesService) {
        super();
    }

    /**
     * 获取思维导图示例配置
     * @returns 思维导图示例配置
     */
    @Get()
    async getConfig(): Promise<MindMapExample> {
        return await this.examplesService.getConfig();
    }

    /**
     * 保存思维导图示例配置
     * @param data 配置数据
     * @returns 保存后的配置
     */
    @Post("save")
    async saveConfig(@Body() data: Partial<MindMapExample>): Promise<MindMapExample> {
        return await this.examplesService.saveConfig(data);
    }
}
