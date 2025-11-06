import { BaseService } from "@buildingai/core/modules/base/services/base.service";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { MindMapExample } from "../../../db/entities/mind-map-example.entity";

@Injectable()
export class ExamplesService extends BaseService<MindMapExample> {
    constructor(
        @InjectRepository(MindMapExample)
        private readonly mindMapExampleRepository: Repository<MindMapExample>,
    ) {
        super(mindMapExampleRepository);
    }

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

    /**
     * 获取思维导图示例配置（前台用户使用）
     * @returns 思维导图示例配置
     */
    async getConfigUser(): Promise<MindMapExample> {
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

        return config;
    }
}
