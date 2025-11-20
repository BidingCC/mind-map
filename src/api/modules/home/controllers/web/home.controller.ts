import { ExtensionWebController } from "@buildingai/core/decorators";
import { Get } from "@nestjs/common";

import { MindMapHomePublicInterface } from "../../interface/mind-map-home.interface";
import { HomeService } from "../../services/home.service";

@ExtensionWebController("home")
export class HomeWebController {
    constructor(private readonly homeService: HomeService) {}

    /**
     * 获取思维导图首页配置（前台用户使用）
     * @returns 思维导图首页配置
     */
    @Get("config")
    async getHomeConfig(): Promise<MindMapHomePublicInterface> {
        return await this.homeService.getHomeConfigUser();
    }
}
