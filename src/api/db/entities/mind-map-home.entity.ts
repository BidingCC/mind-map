import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "@buildingai/db/typeorm";

/**
 * 思维导图首页配置
 */
@ExtensionEntity({ name: "mind_map_home", comment: "思维导图首页配置" })
export class MindMapHome {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * 插件显示名称
     */
    @Column({
        type: "text",
        comment: "插件显示名称",
        nullable: true,
    })
    name: string;

    /**
     * 宣传语文案
     */
    @Column({
        type: "text",
        comment: "宣传语文案",
        nullable: true,
    })
    publicLanguage: string;

    /**
     * 宣传语副标题
     */
    @Column({
        type: "text",
        comment: "宣传语副标题",
        nullable: true,
    })
    description: string;

    /**
     * 是否启用副标题
     */
    @Column({
        type: "boolean",
        comment: "是否启用副标题",
        default: true,
    })
    enabledDescription: boolean;

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
