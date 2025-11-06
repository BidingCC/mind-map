import { ExtensionWebController } from "@buildingai/core/decorators";
import { BaseController } from "@buildingai/core/modules/base/controllers/base.controller";
import { Get } from "@nestjs/common";

import { MindMapConfigUserDto } from "../../dto/mind-map-config-user.dto";
import { ConfigService } from "../../services/config.service";

@ExtensionWebController("config")
export class ConfigWebController extends BaseController {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    /**
     * 获取思维导图插件配置（前台用户使用）
     * @returns 思维导图插件配置
     */
    @Get("plugin-user")
    async getConfigUser(): Promise<MindMapConfigUserDto> {
        return await this.configService.getConfigUser();
    }
}
