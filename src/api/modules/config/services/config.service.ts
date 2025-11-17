import { BaseService } from "@buildingai/base/services/base.service";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import { MindMapConfig } from "../../../db/entities/mind-map-config.entity";
import { MindMapConfigUserDto } from "../dto/mind-map-config-user.dto";

@Injectable()
export class ConfigService extends BaseService<MindMapConfig> {
    constructor(
        @InjectRepository(MindMapConfig)
        private readonly mindMapConfigRepository: Repository<MindMapConfig>,
    ) {
        super(mindMapConfigRepository);
    }

    // =================================================================
    // 后台用户服务
    // =================================================================

    /**
     * 获取思维导图插件配置
     * @returns 思维导图插件配置
     */
    async getConfig(): Promise<MindMapConfig> {
        // 查找第一条配置记录，如果没有则创建默认配置
        let config = await this.mindMapConfigRepository.findOne({
            where: {},
            order: {
                createdAt: "ASC",
            },
        });

        if (!config) {
            config = new MindMapConfig();
            config.bindModel = "";
            config.bindModelId = "";
            // config.bindKeyConfigId = "";
            config.billingType = 1; // 默认按字数计费
            config.billingSetting = 1; // 默认消耗1积分
            await this.mindMapConfigRepository.save(config);
        }

        return config;
    }

    /**
     * 保存思维导图插件配置
     * @param id 配置ID
     * @param data 配置数据
     * @returns 保存后的配置
     */
    async saveConfig(id: string, data: Partial<MindMapConfig>): Promise<MindMapConfig> {
        // 查找现有配置或创建新配置
        let config = await this.mindMapConfigRepository.findOne({
            where: {
                id,
            },
        });

        if (!config) {
            config = new MindMapConfig();
        }

        // 更新配置字段
        if (data.bindModel !== undefined) config.bindModel = data.bindModel;
        if (data.bindModelId !== undefined) config.bindModelId = data.bindModelId;
        // if (data.bindKeyConfigId !== undefined) config.bindKeyConfigId = data.bindKeyConfigId;
        if (data.billingType !== undefined) config.billingType = data.billingType;
        if (data.billingSetting !== undefined) config.billingSetting = data.billingSetting;

        return await this.mindMapConfigRepository.save(config);
    }

    // =================================================================
    // 前台用户服务
    // =================================================================

    /**
     * 获取思维导图插件配置（前台用户使用）
     * @returns 思维导图插件配置
     */
    async getConfigUser(): Promise<MindMapConfigUserDto> {
        let config = await this.mindMapConfigRepository.findOne({
            where: {},
            order: {
                createdAt: "ASC",
            },
        });

        if (!config) {
            config = new MindMapConfig();
            config.bindModel = "";
            config.bindModelId = "";
            // config.bindKeyConfigId = "";
            config.billingType = 1; // 默认按字数计费
            config.billingSetting = 1; // 默认消耗1积分
        }

        return new MindMapConfigUserDto(config);
    }
}
