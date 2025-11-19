import { BaseService } from "@buildingai/base/services/base.service";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { MindMapHome } from "../../../db/entities/mind-map-home.entity";
import { MindMapHomePublicInterface } from "../interface/mind-map-home.interface";

@Injectable()
export class HomeService extends BaseService<MindMapHome> {
    constructor(
        @InjectRepository(MindMapHome)
        private readonly mindMapHomeRepository: Repository<MindMapHome>,
    ) {
        super(mindMapHomeRepository);
    }

    // =================================================================
    // 后台用户服务
    // =================================================================

    /**
     * 获取思维导图首页配置
     * @returns 思维导图首页配置
     */
    async getHomeConfig(): Promise<MindMapHome> {
        try {
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
                this.logger.debug("[MindMapExtension] 创建默认首页配置");
            }

            this.logger.debug("[MindMapExtension] 获取首页配置成功");
            return config;
        } catch (error) {
            this.logger.error("[MindMapExtension] 获取配置失败", error);
            throw HttpErrorFactory.internal("Failed to get config.");
        }
    }

    /**
     * 保存思维导图首页配置
     * @param data 配置数据
     * @returns 保存后的配置
     */
    async saveHomeConfig(data: Partial<MindMapHome>): Promise<MindMapHome> {
        try {
            // 校验字段长度
            if (data.name !== undefined && data.name.length > 15) {
                this.logger.warn("[MindMapExtension] 插件显示名称超过15个字符", {
                    nameLength: data.name.length,
                });
                throw HttpErrorFactory.badRequest(
                    `Plugin display name cannot exceed 15 characters.`,
                );
            }

            if (data.description !== undefined && data.description.length > 25) {
                this.logger.warn("[MindMapExtension] 插件描述超过25个字符", {
                    descriptionLength: data.description.length,
                });
                throw HttpErrorFactory.badRequest(
                    `Plugin description cannot exceed 25 characters.`,
                );
            }

            // 校验宣传语文案内容是否超过四行
            if (data.publicLanguage !== undefined) {
                const blockElementMatches = data.publicLanguage.match(
                    /<(p|h[1-6]|div|li|blockquote)\b[^>]*>/gi,
                );
                let lineCount = blockElementMatches ? blockElementMatches.length : 0;

                // 如果没有任何块级元素但有内容，则至少算作一行
                if (lineCount === 0 && data.publicLanguage.trim()) {
                    lineCount = 1;
                }

                if (lineCount > 4) {
                    this.logger.warn("[MindMapExtension] 宣传语文案超过四行", { lineCount });
                    throw HttpErrorFactory.badRequest(
                        `The number of lines in the slogan cannot exceed four.`,
                    );
                }
            }

            // 查找现有配置或创建新配置
            const config = await this.mindMapHomeRepository.findOne({
                where: {},
                order: {
                    createdAt: "ASC",
                },
            });

            if (!config) {
                this.logger.warn("[MindMapExtension] 首页配置未找到");
                throw HttpErrorFactory.notFound("Config not found");
            }

            // 更新配置字段
            if (data.name !== undefined) config.name = data.name;
            if (data.publicLanguage !== undefined) config.publicLanguage = data.publicLanguage;
            if (data.description !== undefined) config.description = data.description;
            if (data.enabledDescription !== undefined)
                config.enabledDescription = data.enabledDescription;

            const result = await this.mindMapHomeRepository.save(config);
            this.logger.debug("[MindMapExtension] 首页配置保存成功");
            return result;
        } catch (error) {
            this.logger.error("[MindMapExtension] 保存配置失败", error);
            throw HttpErrorFactory.internal("Failed to save config.");
        }
    }

    // =================================================================
    // 前台用户服务
    // =================================================================

    /**
     * 获取思维导图首页配置（前台用户使用）
     * @returns 思维导图首页配置
     */
    async getHomeConfigUser(): Promise<MindMapHomePublicInterface> {
        try {
            // 查找第一条配置记录
            const config = await this.mindMapHomeRepository.findOne({
                where: {},
                order: {
                    createdAt: "ASC",
                },
            });

            if (!config) {
                this.logger.warn("[MindMapExtension] 用户首页配置未找到");
                throw HttpErrorFactory.notFound(
                    "Config not found, please contact the administrator.",
                );
            }

            this.logger.debug("[MindMapExtension] 获取用户首页配置成功");
            return {
                name: config.name,
                publicLanguage: config.publicLanguage,
                description: config.description,
                enabledDescription: config.enabledDescription,
            };
        } catch (error) {
            this.logger.error("[MindMapExtension] 获取配置失败", error);
            throw HttpErrorFactory.internal("Failed to get config.");
        }
    }
}
