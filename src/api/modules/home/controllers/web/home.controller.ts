import { ExtensionWebController } from "@buildingai/core/decorators";
import { BaseController } from "@buildingai/core/modules/base/controllers/base.controller";
import { Get } from "@nestjs/common";

import { MindMapHome } from "../../../../db/entities/mind-map-home.entity";
import { HomeService } from "../../services/home.service";

@ExtensionWebController("home")
export class HomeWebController extends BaseController {
    constructor(private readonly homeService: HomeService) {
        super();
    }

    /**
     * 获取思维导图首页配置（前台用户使用）
     * @returns 思维导图首页配置
     */
    @Get("config")
    async getHomeConfig(): Promise<MindMapHome> {
        return await this.homeService.getHomeConfigUser();
    }
}
