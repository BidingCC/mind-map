import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "@buildingai/db/typeorm";

/**
 * 思维导图示例配置
 */
@ExtensionEntity({ name: "mind_map_example", comment: "思维导图示例配置" })
export class MindMapExample {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * 开场白
     */
    @Column({
        type: "text",
        comment: "开场白",
        nullable: true,
    })
    prologue: string;

    /**
     * 试一试
     */
    @Column({
        type: "json",
        comment: "试一试",
        nullable: true,
    })
    try: any[];

    /**
     * 对话框文字
     */
    @Column({
        type: "text",
        comment: "对话框文字",
        nullable: true,
    })
    dialogText: string;

    /**
     * 是否启用试一试
     */
    @Column({
        type: "boolean",
        comment: "是否启用试一试",
        default: true,
    })
    enabledTry: boolean;

    /**
     * 是否启用对话框文字
     */
    @Column({
        type: "boolean",
        comment: "是否启用对话框文字",
        default: true,
    })
    enabledDialog: boolean;

    /**
     * 创建时间
     */
    @CreateDateColumn({
        type: "timestamp with time zone",
        comment: "创建时间",
    })
    createdAt: Date;

    /**
     * 更新时间
     */
    @UpdateDateColumn({
        type: "timestamp with time zone",
        comment: "更新时间",
    })
    updatedAt: Date;
}
