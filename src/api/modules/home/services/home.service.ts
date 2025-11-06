import { BaseService } from "@buildingai/core/modules/base/services/base.service";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { MindMapHome } from "../../../db/entities/mind-map-home.entity";

@Injectable()
export class HomeService extends BaseService<MindMapHome> {
    constructor(
        @InjectRepository(MindMapHome)
        private readonly mindMapHomeRepository: Repository<MindMapHome>,
    ) {
        super(mindMapHomeRepository);
    }

    /**
     * 获取思维导图首页配置
     * @returns 思维导图首页配置
     */
    async getHomeConfig(): Promise<MindMapHome> {
        // 查找第一条配置记录，如果没有则创建默认配置
        let config = await this.mindMapHomeRepository.findOne({
            where: {},
            order: {
                createdAt: "ASC",
            },
        });

        if (!config) {
            config = new MindMapHome();
            config.name = "";
            config.publicLanguage = "";
            config.description = "";
            config.enabledDescription = true;
            await this.mindMapHomeRepository.save(config);
        }

        return config;
    }

    /**
     * 保存思维导图首页配置
     * @param data 配置数据
     * @returns 保存后的配置
     */
    async saveHomeConfig(data: Partial<MindMapHome>): Promise<MindMapHome> {
        // 查找现有配置或创建新配置
        let config = await this.mindMapHomeRepository.findOne({
            where: {},
            order: {
                createdAt: "ASC",
            },
        });

        if (!config) {
            config = new MindMapHome();
        }

        // 更新配置字段
        if (data.name !== undefined) config.name = data.name;
        if (data.publicLanguage !== undefined) config.publicLanguage = data.publicLanguage;
        if (data.description !== undefined) config.description = data.description;
        if (data.enabledDescription !== undefined)
            config.enabledDescription = data.enabledDescription;

        return await this.mindMapHomeRepository.save(config);
    }

    /**
     * 获取思维导图首页配置（前台用户使用）
     * @returns 思维导图首页配置
     */
    async getHomeConfigUser(): Promise<MindMapHome> {
        // 查找第一条配置记录，如果没有则创建默认配置
        let config = await this.mindMapHomeRepository.findOne({
            where: {},
            order: {
                createdAt: "ASC",
            },
        });

        if (!config) {
            config = new MindMapHome();
            config.name = "";
            config.publicLanguage = "";
            config.description = "";
            config.enabledDescription = true;
        }

        return config;
    }
}
