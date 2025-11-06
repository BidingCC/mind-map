import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from "class-validator";

import { ChatRole } from "../interfaces/ai-sdk.interface";

/**
 * 聊天消息DTO
 */
export class AiChatMessageDto {
    /**
     * 消息角色
     */
    @IsEnum(ChatRole, { message: "消息角色必须是有效的角色类型" })
    role?: ChatRole;

    @IsOptional()
    content: string;
}

/**
 * 函数定义DTO
 */
export class ChatFunctionDto {
    /**
     * 函数名
     */
    @IsString({ message: "函数名必须是字符串" })
    @IsNotEmpty({ message: "函数名不能为空" })
    name: string;

    /**
     * 函数描述
     */
    @IsString({ message: "函数描述必须是字符串" })
    @IsOptional()
    description?: string;

    /**
     * 函数参数定义
     */
    @IsObject({ message: "函数参数定义必须是对象" })
    parameters: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
}

/**
 * 聊天请求DTO
 */
export class ChatRequestDto {
    /**
     * 使用的模型ID（可选，不传则使用默认模型）
     */
    @IsUUID(undefined, { message: "模型ID必须是有效的UUID格式" })
    @IsOptional()
    modelId?: string;

    /**
     * 对话ID（如果是继续之前的对话）
     */
    @IsUUID(undefined, { message: "对话ID必须是有效的UUID格式" })
    @IsOptional()
    conversationId?: string;

    /**
     * 对话标题（用于新建对话时）
     */
    @IsString({ message: "对话标题必须是字符串" })
    @IsOptional()
    title?: string;

    /**
     * 是否保存对话记录
     */
    @IsBoolean({ message: "保存对话记录标识必须是布尔值" })
    @IsOptional()
    saveConversation?: boolean;

    /**
     * 聊天消息列表
     */
    @IsArray({ message: "聊天消息必须是数组" })
    @ValidateNested({ each: true })
    @Type(() => AiChatMessageDto)
    messages: AiChatMessageDto[];

    /**
     * 关联的思维导图ID
     */
    @IsOptional()
    @IsString({ message: "思维导图ID必须是字符串" })
    @IsUUID(4, { message: "思维导图ID必须是有效的UUID格式" })
    mindMapId?: string;
}
