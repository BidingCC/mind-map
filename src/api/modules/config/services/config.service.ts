import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
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
        try {
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
                config.billingType = 2;
                config.billingSetting = 0;
                await this.mindMapConfigRepository.save(config);
                this.logger.debug("[MindMapExtension] 创建默认配置");
            }

            this.logger.debug("[MindMapExtension] 获取插件配置成功");
            return config;
        } catch (error) {
            this.logger.error("[MindMapExtension] 获取思维导图插件配置时出错:", error);
            throw HttpErrorFactory.internal("Failed to get mind map config.");
        }
    }

    /**
     * 保存思维导图插件配置
     * @param id 配置ID
     * @param data 配置数据
     * @returns 保存后的配置
     */
    async saveConfig(id: string, data: Partial<MindMapConfig>): Promise<MindMapConfig> {
        try {
            // 查找现有配置或创建新配置
            const config = await this.mindMapConfigRepository.findOne({
                where: {
                    id,
                },
            });

            if (!config) {
                this.logger.warn("[MindMapExtension] 配置未找到", { id });
                throw HttpErrorFactory.notFound("Config not found");
            }

            // 更新配置字段
            if (data.bindModel !== undefined) config.bindModel = data.bindModel;
            if (data.bindModelId !== undefined) config.bindModelId = data.bindModelId;
            // if (data.bindKeyConfigId !== undefined) config.bindKeyConfigId = data.bindKeyConfigId;
            if (data.billingType !== undefined) config.billingType = data.billingType;
            if (data.billingSetting !== undefined) config.billingSetting = data.billingSetting;

            const result = await this.mindMapConfigRepository.save(config);
            this.logger.debug("[MindMapExtension] 配置保存成功", { id });
            return result;
        } catch (error) {
            this.logger.error("[MindMapExtension] 保存配置失败", error);
            throw HttpErrorFactory.internal("Failed to save mind map config.");
        }
    }

    // =================================================================
    // 前台用户服务
    // =================================================================

    /**
     * 获取思维导图插件配置（前台用户使用）
     * @returns 思维导图插件配置
     */
    async getConfigUser(): Promise<MindMapConfigUserDto> {
        try {
            const config = await this.mindMapConfigRepository.findOne({
                where: {},
                order: {
                    createdAt: "ASC",
                },
            });

            if (!config) {
                this.logger.warn("[MindMapExtension] 用户配置未找到");
                throw HttpErrorFactory.notFound(
                    "Config not found, please contact the administrator.",
                );
            }

            this.logger.debug("[MindMapExtension] 获取用户配置成功");
            return new MindMapConfigUserDto(config);
        } catch (error) {
            this.logger.error("[MindMapExtension] 获取思维导图插件配置时出错:", error);
            throw HttpErrorFactory.internal("Failed to get config.");
        }
    }
}
