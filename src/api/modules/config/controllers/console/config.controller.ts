import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { UUIDValidationPipe } from "@buildingai/pipe/param-validate.pipe";
import { Body, Get, Param, Post } from "@nestjs/common";

import { MindMapConfig } from "../../../../db/entities/mind-map-config.entity";
import { ConfigService } from "../../services/config.service";

@ExtensionConsoleController("config", "思维导图配置")
export class ConfigConsoleController {
    constructor(private readonly configService: ConfigService) {}

    /**
     * 获取思维导图插件配置
     * @returns 思维导图插件配置
     */
    @Get("plugin")
    async getConfig(): Promise<MindMapConfig> {
        return await this.configService.getConfig();
    }

    /**
     * 保存思维导图插件配置
     * @param id 配置ID
     * @param data 配置数据
     * @returns 保存是否成功
     */
    @Post("save-plugin/:id")
    async saveConfig(
        @Param("id", UUIDValidationPipe) id: string,
        @Body() data: Partial<MindMapConfig>,
    ): Promise<boolean> {
        return await this.configService.saveConfig(id, data);
    }
}
