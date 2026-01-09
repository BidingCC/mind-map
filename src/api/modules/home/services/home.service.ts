import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { MindMapHome } from "../../../db/entities/mind-map-home.entity";
import { SaveHomeConfigDto } from "../dto/save-home-config.dto";
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
                console.log("[MindMapExtension] 创建默认首页配置");
            }

            return config;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 获取配置失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("获取配置失败");
        }
    }

    /**
     * 保存思维导图首页配置
     * @param dto 配置数据
     * @returns 保存是否成功
     */
    async saveHomeConfig(dto: SaveHomeConfigDto): Promise<boolean> {
        try {
            // 校验宣传语文案内容是否超过四行
            if (dto.publicLanguage !== undefined) {
                const blockElementMatches = dto.publicLanguage.match(
                    /<(p|h[1-6]|div|li|blockquote)\b[^>]*>/gi,
                );
                let lineCount = blockElementMatches ? blockElementMatches.length : 0;

                // 如果没有任何块级元素但有内容，则至少算作一行
                if (lineCount === 0 && dto.publicLanguage.trim()) {
                    lineCount = 1;
                }

                if (lineCount > 4) {
                    this.logger.warn(
                        `[MindMapExtension] 宣传语文案超过四行: lineCount=${lineCount}`,
                    );
                    throw HttpErrorFactory.badRequest("宣传语文案行数不能超过四行");
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
                throw HttpErrorFactory.notFound("配置不存在");
            }

            // 更新配置字段
            if (dto.name !== undefined) config.name = dto.name;
            if (dto.publicLanguage !== undefined) config.publicLanguage = dto.publicLanguage;
            if (dto.description !== undefined) config.description = dto.description;
            if (dto.enabledDescription !== undefined)
                config.enabledDescription = dto.enabledDescription;

            const saved = await this.mindMapHomeRepository.save(config);
            this.logger.debug("[MindMapExtension] 首页配置保存成功");
            return !!saved.id;
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 保存配置失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("保存配置失败");
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
                throw HttpErrorFactory.notFound("配置不存在，请联系管理员");
            }

            return {
                name: config.name,
                publicLanguage: config.publicLanguage,
                description: config.description,
                enabledDescription: config.enabledDescription,
            };
        } catch (error) {
            // 如果是业务错误（HttpErrorFactory 抛出的），直接重新抛出
            if (
                error &&
                typeof error === "object" &&
                ("httpStatus" in error || "businessCode" in error)
            ) {
                throw error;
            }
            // 系统错误才包装成内部错误
            this.logger.error(
                `[MindMapExtension] 获取配置失败: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
            );
            throw HttpErrorFactory.internal("获取配置失败");
        }
    }
}
