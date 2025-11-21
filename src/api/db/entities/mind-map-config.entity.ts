import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "@buildingai/db/typeorm";

/**
 * 思维导图插件配置
 */
@ExtensionEntity({ name: "mind_map_config", comment: "思维导图插件配置" })
export class MindMapConfig {
    /**
     * 主键
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * 绑定的模型
     */
    @Column({
        type: "varchar",
        length: 255,
        comment: "绑定的模型",
    })
    bindModel: string;

    /**
     * 绑定的模型ID
     */
    @Column({
        type: "varchar",
        length: 255,
        comment: "绑定的模型ID",
        nullable: true,
    })
    bindModelId: string;

    /**
     * 绑定的密钥配置ID
     */
    // @Column({
    //     type: "varchar",
    //     length: 255,
    //     comment: "绑定的密钥配置ID",
    // })
    // bindKeyConfigId: string;

    /**
     * 计费类型  1、按字数 2、免费
     */
    @Column({
        type: "int",
        comment: "计费类型",
    })
    billingType: number;

    /**
     * 计费设置
     */
    @Column({
        type: "int",
        comment: "计费设置",
    })
    billingSetting: number;

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
