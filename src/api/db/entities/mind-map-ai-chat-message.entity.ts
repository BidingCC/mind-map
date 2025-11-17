import { ExtensionEntity } from "@buildingai/core/decorators/extension-entity.decorator";
import { AiModel } from "@buildingai/db/entities/ai-model.entity";
import {
    Column,
    CreateDateColumn,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "@buildingai/db/typeorm";

import { MindMapAiChatRecord } from "./mind-map-ai-chat-record.entity";

/**
 * AI对话消息实体
 * 存储对话中的具体消息内容
 */
@ExtensionEntity({ name: "mind_map_ai_chat_message", comment: "思维导图AI对话消息记录" })
@Index(["conversationId", "createdAt"])
@Index(["role", "createdAt"])
export class MindMapAiChatMessage {
    /**
     * 主键ID (UUID)
     */
    @PrimaryGeneratedColumn("uuid")
    id: string;

    /**
     * 对话ID
     */
    @Column({
        type: "uuid",
        comment: "所属对话ID",
    })
    conversationId: string;

    /**
     * 使用的AI模型ID
     */
    @Column({
        type: "uuid",
        comment: "消息使用的AI模型ID",
        nullable: true,
    })
    @Index()
    modelId: string;

    /**
     * 消息角色
     */
    @Column({
        type: "varchar",
        length: 20,
        comment: "消息角色: user-用户, assistant-AI助手, system-系统",
    })
    @Index()
    role: "user" | "assistant" | "system";

    /**
     * 消息内容
     */
    @Column({
        type: "text",
        comment: "消息文本内容",
    })
    content: string;

    /**
     * 消息类型
     */
    @Column({
        type: "varchar",
        length: 20,
        default: "text",
        comment: "消息类型: text-文本, image-图片, file-文件",
    })
    messageType: "text" | "image" | "file";

    /**
     * Token消耗
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "Token使用情况",
    })
    tokens?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };

    /**
     * 用户算力消耗
     */
    @Column({
        type: "int",
        nullable: true,
        comment: "用户算力消耗",
    })
    userConsumedPower?: number;

    /**
     * 消息状态
     */
    @Column({
        type: "varchar",
        length: 20,
        default: "completed",
        comment: "消息状态: sending-发送中, completed-已完成, failed-失败",
    })
    status: "sending" | "completed" | "failed";

    /**
     * 错误信息
     */
    @Column({
        type: "text",
        nullable: true,
        comment: "错误信息（当状态为failed时）",
    })
    errorMessage?: string;

    /**
     * 消息序号
     */
    @Column({
        type: "int",
        comment: "在对话中的消息序号",
    })
    @Index()
    sequence: number;

    /**
     * 处理时长（毫秒）
     */
    @Column({
        type: "int",
        nullable: true,
        comment: "AI处理该消息的时长（毫秒）",
    })
    processingTime?: number;

    /**
     * 模型响应的原始数据
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "模型响应的原始数据",
    })
    rawResponse?: Record<string, any>;

    /**
     * 扩展数据
     */
    @Column({
        type: "jsonb",
        nullable: true,
        comment: "扩展数据字段",
    })
    metadata?: Record<string, any>;

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
     * 所属对话
     */
    @ManyToOne("MindMapAiChatRecord", {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "conversation_id" })
    conversation: Awaited<MindMapAiChatRecord>;

    /**
     * 使用的AI模型
     */
    @ManyToOne(() => AiModel, {
        onDelete: "CASCADE",
    })
    @JoinColumn({ name: "model_id" })
    model: Awaited<AiModel>;
}
