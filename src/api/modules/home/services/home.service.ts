import { BaseService } from "@buildingai/base/services/base.service";
import { HttpErrorFactory } from "@buildingai/errors";
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
        // 校验字段长度
        if (data.name !== undefined && data.name.length > 15) {
            throw HttpErrorFactory.badRequest(`插件显示名称不能超过15个字符。`);
        }

        if (data.description !== undefined && data.description.length > 25) {
            throw HttpErrorFactory.badRequest(`宣传语副标题不能超过25个字符。`);
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
                throw HttpErrorFactory.badRequest(`宣传语文案内容不能超过四行。`);
            }
        }

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
