import { BaseService } from "@buildingai/base";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { MindMapExample } from "../../../db/entities/mind-map-example.entity";
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
            this.logger.error(`[MindMapExtension] 获取配置失败: ${error}`);
            throw HttpErrorFactory.internal("获取配置失败");
        }
    }

    /**
     * 保存思维导图示例配置
     * @param data 配置数据
     * @returns 保存后的配置
     */
    async saveConfig(data: Partial<MindMapExample>): Promise<MindMapExample> {
        try {
            if (data.try && Array.isArray(data.try)) {
                for (const item of data.try) {
                    if (
                        item.content &&
                        typeof item.content === "string" &&
                        item.content.length > 35
                    ) {
                        this.logger.warn("[MindMapExtension] 示例内容超过35个字符", {
                            contentLength: item.content.length,
                        });
                        throw HttpErrorFactory.badRequest(
                            `示例内容不能超过35个字符，当前长度：${item.content.length}`,
                        );
                    }
                }
            }

            if (data.dialogText !== undefined && data.dialogText.length > 20) {
                this.logger.warn("[MindMapExtension] 对话文本超过20个字符", {
                    contentLength: data.dialogText.length,
                });
                throw HttpErrorFactory.badRequest("对话文本不能超过20个字符");
            }

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
            if (data.prologue !== undefined) config.prologue = data.prologue;
            if (data.dialogText !== undefined) config.dialogText = data.dialogText;
            if (data.try !== undefined) config.try = data.try;
            if (data.enabledTry !== undefined) config.enabledTry = data.enabledTry;
            if (data.enabledDialog !== undefined) config.enabledDialog = data.enabledDialog;

            const saved = await this.mindMapExampleRepository.save(config);
            this.logger.debug("[MindMapExtension] 示例配置保存成功");
            return saved;
        } catch (error) {
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
            this.logger.error(`[MindMapExtension] 获取配置失败: ${error}`);
            throw HttpErrorFactory.internal("获取配置失败");
        }
    }
}
