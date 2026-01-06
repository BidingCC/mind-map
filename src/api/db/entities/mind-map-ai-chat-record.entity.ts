import { ExtensionEntity } from "@buildingai/core/decorators";
import { User } from "@buildingai/db/entities";
import {
    Column,
    CreateDateColumn,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    type Relation,
    UpdateDateColumn,
} from "@buildingai/db/typeorm";

import { MindMapAiChatMessage } from "./mind-map-ai-chat-message.entity";
import { MindMapRecord } from "./mind-map-record.entity";

/**
 * AI对话记录实体
 * 记录用户与AI模型的对话会话信息
 */
@ExtensionEntity({ name: "mind_map_ai_chat_record", comment: "思维导图AI对话记录" })
@Index(["userId", "createdAt"])
@Index(["isDeleted", "createdAt"])
export class MindMapAiChatRecord {
    /**
     * 主键ID (UUID)
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * 对话标题
     */
    @Column({
        type: "varchar",
        length: 200,
        comment: "对话标题",
        nullable: true,
    })
    title: string | null;

    /**
     * 用户ID
     */
    @Column({
        type: "uuid",
        comment: "用户ID",
    })
    @Index()
    userId: string;

    /**
     * 关联的思维导图ID
     */
    @Column({
        type: "uuid",
        comment: "关联的思维导图ID",
        nullable: true,
    })
    @Index()
    mindMapId?: string | null;

    /**
     * AI模型ID
     */
    @Column({
        type: "uuid",
        nullable: true,
        comment: "使用的AI模型ID",
    })
    modelId?: string | null;

    /**
     * 对话摘要
     */
    @Column({
        type: "text",
        nullable: true,
        comment: "对话摘要",
    })
    summary?: string | null;

    /**
     * 消息总数
     */
    @Column({
        type: "int",
        default: 0,
        comment: "对话中的消息总数",
    })
    messageCount: number;

    /**
     * 总Token消耗
     */
    @Column({
        type: "int",
        default: 0,
        comment: "本次对话消耗的总Token数",
    })
    totalTokens: number;

    /**
     * 总Power消耗
     */
    @Column({
        type: "int",
        default: 0,
        comment: "本次对话消耗的总Power数",
    })
    totalPower: number;

    /**
     * 对话状态
     */
    @Column({
        type: "varchar",
        length: 20,
        default: "active",
        comment: "对话状态: active-进行中, completed-已完成, failed-失败",
    })
    @Index()
    status: "active" | "completed" | "failed";

    /**
     * 是否删除（软删除）
     */
    @Column({
        type: "boolean",
        default: false,
        comment: "是否已删除",
    })
    @Index()
    isDeleted: boolean;

    /**
     * 扩展数据
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "扩展数据字段",
    })
    metadata?: Record<string, any> | null;

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

    /**
     * 关联的用户
     */
    @ManyToOne(() => User, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "user_id" })
    user: Relation<User>;

    /**
     * 关联的思维导图记录
     */
    @ManyToOne("MindMapRecord", {
        onDelete: "SET NULL",
    })
    @JoinColumn({ name: "mind_map_id" })
    mindMap: Relation<MindMapRecord>;

    /**
     * 对话中的消息列表
     */
    @OneToMany("MindMapAiChatMessage", "conversation", {
        cascade: true,
    })
    messages: Relation<MindMapAiChatMessage[]>;
}
