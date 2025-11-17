import { BaseService } from "@buildingai/base/services/base.service";
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
        // 查找第一条配置记录，如果没有则创建默认配置
        let config = await this.mindMapExampleRepository.findOne({
            where: {},
            order: {
                createdAt: "ASC",
            },
        });

        if (!config) {
            config = new MindMapExample();
            config.prologue = "";
            config.dialogText = "";
            config.try = [];
            config.enabledTry = true;
            config.enabledDialog = true;
            await this.mindMapExampleRepository.save(config);
        }

        return config;
    }

    /**
     * 保存思维导图示例配置
     * @param data 配置数据
     * @returns 保存后的配置
     */
    async saveConfig(data: Partial<MindMapExample>): Promise<MindMapExample> {
        if (data.try && Array.isArray(data.try)) {
            for (const item of data.try) {
                if (item.content && typeof item.content === "string" && item.content.length > 35) {
                    throw HttpErrorFactory.badRequest(
                        `示例内容不能超过35个字符，当前长度：${item.content.length}`,
                    );
                }
            }
        }

        if (data.dialogText !== undefined && data.dialogText.length > 20) {
            throw HttpErrorFactory.badRequest(`对话框文字不能超过20个字符。`);
        }

        // 查找现有配置或创建新配置
        let config = await this.mindMapExampleRepository.findOne({
            where: {},
            order: {
                createdAt: "ASC",
            },
        });

        if (!config) {
            config = new MindMapExample();
        }

        // 更新配置字段
        if (data.prologue !== undefined) config.prologue = data.prologue;
        if (data.dialogText !== undefined) config.dialogText = data.dialogText;
        if (data.try !== undefined) config.try = data.try;
        if (data.enabledTry !== undefined) config.enabledTry = data.enabledTry;
        if (data.enabledDialog !== undefined) config.enabledDialog = data.enabledDialog;

        return await this.mindMapExampleRepository.save(config);
    }

    // =================================================================
    // 前台用户服务
    // =================================================================

    /**
     * 获取思维导图示例配置（前台用户使用）
     * @returns 思维导图示例配置
     */
    async getConfigUser(): Promise<MindMapExampleResponse> {
        // 查找第一条配置记录，如果没有则创建默认配置
        let config = await this.mindMapExampleRepository.findOne({
            where: {},
            order: {
                createdAt: "ASC",
            },
        });

        if (!config) {
            config = new MindMapExample();
            config.prologue = "";
            config.dialogText = "";
            config.try = [];
            config.enabledTry = true;
            config.enabledDialog = true;
        }

        // 构造不包含时间字段的响应对象
        return {
            id: config.id,
            prologue: config.prologue,
            dialogText: config.dialogText,
            try: config.try,
            enabledTry: config.enabledTry,
            enabledDialog: config.enabledDialog,
        };
    }
}
