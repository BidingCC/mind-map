import { ExtensionEntity } from "@buildingai/core/decorators/extension-entity.decorator";
import {
    Column,
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "@buildingai/db/typeorm";

/**
 * 思维导图生成记录
 */
@ExtensionEntity({ name: "mind_map_record", comment: "思维导图生成记录" })
export class MindMapRecord {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * 用户ID
     */
    @Column({
        comment: "用户ID",
    })
    userId: string;

    /**
     * 用户名称
     */
    @Column({
        type: "varchar",
        comment: "用户名称",
    })
    userName: string;

    /**
     * 用户头像
     */
    @Column({
        type: "varchar",
        comment: "用户头像",
        nullable: true,
    })
    userAvatar: string;

    /**
     * 生成时间
     */
    @CreateDateColumn({
        type: "timestamp with time zone",
        comment: "生成时间",
    })
    createdAt: Date;

    /**
     * 对话次数
     */
    @Column({
        type: "integer",
        comment: "对话次数",
    })
    conversationTimes: number;

    /**
     * 画板名称
     */
    @Column({
        type: "varchar",
        comment: "画板名称",
    })
    description: string;

    /**
     * 思维导图数据 (JSON格式)
     */
    @Column({
        type: "json",
        comment: "思维导图数据",
        nullable: true,
    })
    mindMapData: any;

    /**
     * 消耗积分
     */
    @Column({
        type: "integer",
        comment: "消耗积分",
    })
    powerUsed: number;

    /**
     * 关联的AI对话记录ID
     */
    @Column({
        type: "uuid",
        comment: "关联的AI对话记录ID",
        nullable: true,
    })
    aiChatRecordId?: string;

    /**
     * 更新时间
     */
    @UpdateDateColumn({
        type: "timestamp with time zone",
        comment: "更新时间",
    })
    updatedAt: Date;
}
