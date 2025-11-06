import { ExtensionWebController } from "@buildingai/core/decorators";
import { BaseController } from "@buildingai/core/modules/base/controllers/base.controller";
import { Get } from "@nestjs/common";

import { MindMapExample } from "../../../../db/entities/mind-map-example.entity";
import { ExamplesService } from "../../services/examples.service";

@ExtensionWebController("examples")
export class ExamplesWebController extends BaseController {
    constructor(private readonly examplesService: ExamplesService) {
        super();
    }

    /**
     * 获取思维导图示例配置（前台用户使用）
     * @returns 思维导图示例配置
     */
    @Get()
    async getExamplesConfig(): Promise<MindMapExample> {
        return await this.examplesService.getConfigUser();
    }
}
