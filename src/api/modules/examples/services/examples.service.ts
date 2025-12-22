import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { MindMapExample } from "../../../db/entities/mind-map-example.entity";
import { SaveExamplesConfigDto } from "../dto/save-examples-config.dto";
import { MindMapExampleResponse } from "../interfaces/mind-map-example.interface";

@Injectable()
export class ExamplesService extends BaseService<MindMapExample> {
    constructor(
        @InjectRepository(MindMapExample)
        private readonly mindMapExampleRepository: Repository<MindMapExample>,
    ) {
        super(mindMapExampleRepository);
    }

    // =================================================================
    // 后台用户服务
    // =================================================================

    /**
     * 获取思维导图示例配置
     * @returns 思维导图示例配置
     */
    async getConfig(): Promise<MindMapExample> {
        try {
            // 查找第一条配置记录，如果没有则创建默认配置
            let config = await this.mindMapExampleRepository.findOne({
                where: {},
                order: {
                    createdAt: "ASC",
                },
            });

            if (!config) {
                config = new MindMapExample();
                config.prologue = "<p>👋 Hi，朋友! 告诉我你的想法，我马上能变出一张思维导图~</p>";
                config.dialogText = "提问即创造";
                config.try = [
                    {
                        id: "1762826586470",
                        content: "📅 制定高效率的个人周计划",
                    },
                    {
                        id: "1762934979397",
                        content: "📄 课程任务进度管理",
                    },
                    {
                        id: "1763025414987",
                        content: "💡 XXXXXX产品功能清单",
                    },
                ];
                config.enabledTry = true;
                config.enabledDialog = true;
                await this.mindMapExampleRepository.save(config);
                this.logger.debug("[MindMapExtension] 创建默认示例配置");
            }

            this.logger.debug("[MindMapExtension] 获取示例配置成功");
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
     * 保存思维导图示例配置
     * @param dto 配置数据
     * @returns 保存是否成功
     */
    async saveConfig(dto: SaveExamplesConfigDto): Promise<boolean> {
        try {
            // 查找现有配置
            const config = await this.mindMapExampleRepository.findOne({
                where: {},
                order: {
                    createdAt: "ASC",
                },
            });

            if (!config) {
                this.logger.warn("[MindMapExtension] 示例配置未找到");
                throw HttpErrorFactory.notFound("配置不存在");
            }

            // 更新配置字段
            if (dto.prologue !== undefined) config.prologue = dto.prologue;
            if (dto.dialogText !== undefined) config.dialogText = dto.dialogText;
            if (dto.try !== undefined) config.try = dto.try;
            if (dto.enabledTry !== undefined) config.enabledTry = dto.enabledTry;
            if (dto.enabledDialog !== undefined) config.enabledDialog = dto.enabledDialog;

            const saved = await this.mindMapExampleRepository.save(config);
            this.logger.debug("[MindMapExtension] 示例配置保存成功");
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
     * 获取思维导图示例配置（前台用户使用）
     * @returns 思维导图示例配置
     */
    async getConfigUser(): Promise<MindMapExampleResponse> {
        try {
            // 查找第一条配置记录
            const config = await this.mindMapExampleRepository.findOne({
                where: {},
                order: {
                    createdAt: "ASC",
                },
            });

            if (!config) {
                this.logger.warn("[MindMapExtension] 用户示例配置未找到");
                throw HttpErrorFactory.notFound("配置不存在，请联系管理员");
            }

            this.logger.debug("[MindMapExtension] 获取用户示例配置成功");
            return {
                prologue: config.prologue,
                dialogText: config.dialogText,
                try: config.try,
                enabledTry: config.enabledTry,
                enabledDialog: config.enabledDialog,
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
