import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { Body, Get, Post } from "@nestjs/common";

import { MindMapHome } from "../../../../db/entities/mind-map-home.entity";
import { SaveHomeConfigDto } from "../../dto/save-home-config.dto";
import { HomeService } from "../../services/home.service";

@ExtensionConsoleController("home", "思维导图首页")
export class HomeConsoleController {
    constructor(private readonly homeService: HomeService) {}

    /**
     * 获取思维导图首页配置
     * @returns 思维导图首页配置
     */
    @Get("config")
    async getHomeConfig(): Promise<MindMapHome> {
        return await this.homeService.getHomeConfig();
    }

    /**
     * 保存思维导图首页配置
     * @param dto 配置数据
     * @returns 保存后的配置
     */
    @Post("save")
    async saveHomeConfig(@Body() dto: SaveHomeConfigDto): Promise<MindMapHome> {
        return await this.homeService.saveHomeConfig(dto);
    }
}
