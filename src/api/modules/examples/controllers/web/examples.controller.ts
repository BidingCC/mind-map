import { BaseController } from "@buildingai/base/controllers/base.controller";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { Get } from "@nestjs/common";

import { MindMapExampleResponse } from "../../interfaces/mind-map-example.interface";
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
    async getExamplesConfig(): Promise<MindMapExampleResponse> {
        return await this.examplesService.getConfigUser();
    }
}
