import { TextGenerator } from "@buildingai/ai-sdk";
import { BaseController } from "@buildingai/base";
import { ExtensionWebController } from "@buildingai/core/decorators";
import type { UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { ExtensionBillingService, PublicAiModelService } from "@buildingai/extension-sdk";
import { getProviderSecret } from "@buildingai/utils";
import { Body, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import type {
    ChatCompletion,
    ChatCompletionCreateParams,
    ChatCompletionMessageParam,
} from "openai/resources/index";

import { ChatRequestDto } from "../../dto/ai-chat-message.dto";
import { ConversationStatus, MessageRole, MessageType } from "../../dto/ai-chat-record.dto";
import { CreateService } from "../../services/create.service";

@ExtensionWebController("ai-chat-message")
export class AiChatMessageController extends BaseController {
    constructor(
        private readonly createService: CreateService,
        private readonly aiModelService: PublicAiModelService,
        private readonly extensionBillingService: ExtensionBillingService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {
        super();

        // 在控制器初始化时处理未完成的消息
        this.handleUnfinishedMessagesOnStartup();
    }

    /**
     * 处理应用启动时未完成的消息
     */
    private async handleUnfinishedMessagesOnStartup(): Promise<void> {
        try {
            await this.createService.handleUnfinishedMessages();
        } catch (error) {
            this.logger.error("[MindMapExtension] 处理未完成消息时发生错误:", error);
        }
    }

    /**
     * 流式聊天对话
     * 支持对话记录保存（通过saveConversation参数控制）
     */
    @Post("chat-stream")
    async chatStream(
        @Body() dto: ChatRequestDto,
        @Playground() user: UserPlayground,
        @Res() res: Response,
    ) {
        // 设置SSE响应头
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

        let conversationId = dto.conversationId;
        let fullResponse = "";
        let userConsumedPower = 0;
        let aiMessageId: string | null = null;
        const userInfo = await this.userRepository.findOne({
            where: { id: user.id },
        });

        if (!userInfo) {
            throw HttpErrorFactory.notFound("用户不存在");
        }

        // 标记客户端是否已断开连接
        let isClientDisconnected = false;

        // 监听客户端断开连接事件
        res.on("close", () => {
            isClientDisconnected = true;
            this.logger.debug("[MindMapExtension] 客户端已断开连接");
        });

        // 获取插件配置
        const pluginConfig = await this.createService.getConfig();

        // 检查插件配置是否完整
        if (
            !pluginConfig ||
            !pluginConfig.bindModelId ||
            pluginConfig.billingType === undefined ||
            pluginConfig.billingType === null ||
            (pluginConfig.billingType !== 2 &&
                (pluginConfig.billingSetting === undefined || pluginConfig.billingSetting === null))
        ) {
            throw HttpErrorFactory.internal("配置错误，请联系管理员");
        }
        const providerSecret = await this.aiModelService.getProviderConfig(
            pluginConfig.bindModelId,
        );

        const provider = await this.aiModelService.getProviderAdapter(pluginConfig.bindModelId, {
            apiKey: getProviderSecret("apiKey", providerSecret),
            baseURL: getProviderSecret("baseUrl", providerSecret),
        });

        const model = await this.aiModelService.getModelInfo(pluginConfig.bindModelId);

        const hasSufficientPower = await this.extensionBillingService.hasSufficientPower(
            user.id,
            pluginConfig.billingSetting,
        );

        if (!hasSufficientPower) {
            throw HttpErrorFactory.badRequest("积分不足，请充值后重试");
        }

        try {
            // 如果需要保存对话记录（默认保存，除非明确设置为false）
            let userMessageId: string | null = null;
            if (dto.saveConversation !== false) {
                // 如果没有提供对话ID，创建新对话
                if (!conversationId) {
                    const conversation = await this.createService.createConversation(user.id, {
                        title: dto.title !== undefined ? dto.title : undefined,
                        mindMapId: dto.mindMapId,
                    });
                    conversationId = conversation.id;
                    if (dto.mindMapId) {
                        await this.createService.updateById(dto.mindMapId, {
                            aiChatRecordId: conversationId,
                        });
                    }

                    // 发送对话ID给前端
                    if (!isClientDisconnected) {
                        res.write(
                            `data: ${JSON.stringify({ type: "conversation_id", data: conversationId })}\n\n`,
                        );
                    }
                }

                // 保存用户消息
                const userMessage = dto.messages[dto.messages.length - 1];
                if (userMessage) {
                    // 打印用户问题
                    this.logger.debug(
                        `[MindMapExtension] 🙋 用户问题: ${this.formatContentPreview(
                            userMessage.content,
                        )}`,
                    );

                    const userMessageRecord = await this.createService.createMessage({
                        conversationId,
                        modelId: pluginConfig.bindModelId,
                        role: this.mapChatRoleToMessageRole(userMessage.role || "user"),
                        content: userMessage.content,
                        userConsumedPower: 0,
                        messageType: MessageType.TEXT,
                        status: "completed",
                        processingTime: 0,
                        tokens: {
                            prompt_tokens: 0,
                            completion_tokens: 0,
                            total_tokens: 0,
                        },
                    });
                    userMessageId = userMessageRecord.id;
                }
            } else if (conversationId) {
                // 如果不保存对话记录但有对话ID，发送给前端
                const conversationExists =
                    await this.createService.findOneConversationById(conversationId);
                if (conversationExists && !isClientDisconnected) {
                    res.write(
                        `data: ${JSON.stringify({ type: "conversation_id", data: conversationId })}\n\n`,
                    );
                }
            }

            // 如果不保存对话记录，仍然打印用户问题
            if (dto.saveConversation === false) {
                const userMessage = dto.messages[dto.messages.length - 1];
                if (userMessage) {
                    this.logger.debug(
                        `[MindMapExtension] 🙋 用户问题 (未保存): ${this.formatContentPreview(
                            userMessage.content,
                        )}`,
                    );
                }
            }

            // 获取当前思维导图数据（如果存在）
            let mindMapData = null;
            if (dto.mindMapId) {
                try {
                    const mindMapRecord = await this.createService.findOneById(dto.mindMapId);
                    mindMapData = mindMapRecord?.mindMapData || null;
                } catch (error) {
                    this.logger.warn(
                        `[MindMapExtension] 获取思维导图数据失败: ${error.message}`,
                        error.stack ? error.stack : "",
                    );
                    throw HttpErrorFactory.internal("获取思维导图数据失败");
                }
            }

            const client = new TextGenerator(provider);

            // 如果需要保存对话记录，先创建一个sending状态的AI消息
            if (dto.saveConversation !== false && conversationId) {
                const aiMessage = await this.createService.createMessage({
                    conversationId,
                    modelId: pluginConfig.bindModelId,
                    role: MessageRole.ASSISTANT,
                    content: "",
                    userConsumedPower: 0,
                    messageType: MessageType.TEXT,
                    status: "sending",
                    processingTime: 0,
                    tokens: {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0,
                    },
                });
                aiMessageId = aiMessage.id;
            }

            await this.createService.updateConversationStatus(
                conversationId as string,
                ConversationStatus.ACTIVE,
            );

            // 系统提示
            const systemMessage = {
                role: "system",
                content: `你是一个专门的思维导图 AI 助手，核心任务是让同主题思维导图能从不同维度、视角生成多样化内容，只能用于创建和编辑思维导图，不能用于其他用途。

你的任务是根据用户请求，从多维度（如领域细分、时间阶段、逻辑层次、创意关联等）创建或修改思维导图，需要以 Markdown 格式返回，并且只能使用 Markdown 的标题和无序列表两种语法，支持多层嵌套。只需返回内容即可。请严格遵守以下规则：

【重要】在任何情况下都必须遵守以下输出格式：
1. 回复内容用自然语言，让用户易理解；
2. 不提及思维导图技术细节（如数据结构、字段格式等）；
3. 不说明技术层面的修复 / 改动，只描述对用户有意义的内容变化、功能拓展；
4. 生成或更新思维导图前，必须添加友好提示语，告知用户正在生成或更新；
5. 全量更新（从头生成整个思维导图）：以单个#开头，从不同细分方向（如主题的历史发展、分类变体、跨领域关联、创意延伸等）生成内容，避免重复固定分支；
例如同 “游戏” 主题，可侧重 “游戏设计原理”“游戏产业生态”“游戏文化影响” 等不同核心方向；
6. 增量更新（在现有基础上修改）：以##/###或列表项-开头，聚焦单个节点的多维度拓展（如给 “游戏类型” 节点新增 “小众冷门类型”“未来概念型”，或给 “学习目标” 节点补充 “跨学科融合目标”“兴趣驱动型目标” 等）；
若用户要求修改多个节点，需提示：“目前暂不支持同时修改多个节点，我会优先为您拓展第一个节点（如 “xxx” 节点），后续可再对其他节点单独更新～”，并仅生成第一个节点的拓展内容；
7. 必须用<template></template>标签包裹 Markdown 数据，格式示例：
<template>
# 主题
## 分支1
### 子分支1
- 子分支
  - 子分支
    - 子分支
  - 子分支
    - 子分支
### 子分支2
- 子分支
- 子分支
- 子分支
## 分支2
- 子分支
- 子分支
</template>

严禁使用其他格式（包括但不限于：用---作分隔线、用**强调、用\`\`\`作代码块、标题前加数字 / 特殊符号如>、-等）。

错误的输出格式（禁止使用）示例：
\`\`\`markdown
# 主题
- 分支1
\`\`\`
或者：
 --- ### **1. 游戏的历史** - **起源**：从古代棋类（如围棋、象棋）到现代电子游戏，游戏是人类社交与娱乐的重要形式。 - **电子游戏发展**： - 1972年《 pong 》（Pong）标志着商业电子游戏的开端。 ---

生成同主题思维导图时，会随机选择不同的核心视角 / 细分领域进行拓展，例如：

主题 “旅行”：可侧重 “旅行准备清单（物资 / 攻略）”“旅行文化体验（各地风俗）”“旅行历史演变（不同年代旅行方式）”“旅行创意玩法（小众路线 / 主题旅行）” 等不同核心；
主题 “阅读”：可从 “阅读方法体系”“阅读载体演变”“阅读社交生态”“经典作品分类赏析” 等维度切入；
通过这种 “随机核心视角 + 多维度细分” 的方式，确保同主题多次生成的思维导图内容差异显著、更具多样性。

全量更新输出样例（主题 “游戏”，侧重 “游戏文化影响” 维度）：
" 好的，我将从「游戏文化影响」的角度为您生成思维导图～以下是结构化内容：\n\n<template>\n# 游戏的文化影响 \n## 社会互动层面 \n### 玩家社群 \n- 全球跨地域联机社群 \n- 垂直领域兴趣社群（如解谜游戏、沙盒建造）\n### 社交模式改变 \n- 线上组队替代线下聚会 \n- 游戏内社交关系向现实延伸 \n## 文化创作层面 \n### 衍生内容生态 \n- 游戏改编影视（如《生化危机》系列）\n- 玩家自制同人作品（漫画、音乐、剧情）\n### 艺术表达突破 \n- 独立游戏的实验性叙事 \n- 游戏作为 “互动艺术” 的策展（如博物馆游戏展）\n## 产业联动层面 \n### 跨产业合作 \n- 游戏与文旅结合（主题乐园、实景解谜）\n- 游戏与教育融合（严肃游戏、技能训练）\n### 经济影响分支 \n- 电竞产业的商业体系 \n- 游戏周边的消费链（手办、服饰）\n</template>\n\n 思维导图从社会互动、文化创作、产业联动三个维度，展现游戏对不同领域的文化影响～您可以基于这些分支，补充具体案例或拓展其他维度～"

增量更新输出样例（在现有 “游戏类型” 节点上，新增 “小众创意类型”）：
" 好的，我将为「游戏类型」节点新增 “小众创意类型” 的拓展～优化后内容如下：\n\n<template>\n## 游戏类型 \n### 小众创意类型 \n- 步行模拟类（侧重叙事与氛围体验）\n - 代表作品：《伊迪芬奇的记忆》\n - 核心特点：弱化玩法，强化故事沉浸 \n- 实验性互动类 \n - 代表作品：《山》（仅观察山体变化）\n - 核心特点：打破传统 “目标 - 反馈” 逻辑 \n- 哲学思辨类 \n - 代表作品：《史丹利的寓言》\n - 核心特点：通过选择引发对自由意志的思考 \n</template>\n\n 思维导图已为 “游戏类型” 新增小众创意类的细分，涵盖步行模拟、实验互动、哲学思辨等方向～这些类型更强调艺术表达与思想传递，能丰富对游戏多样性的认知～"
若用户请求与思维导图无关，需引导：“您好～我是思维导图助手，专注于帮您创建 / 优化思维导图～如果需要生成思维导图，可以告诉我主题或现有内容，我会从多样维度为您拓展～”

返回内容结构：
提示语 + <template>思维导图Markdown数据</template> + 总结

当前思维导图数据：
${mindMapData ? JSON.stringify(mindMapData, null, 2) : "当前没有思维导图数据"}

请严格按照用户请求创建或修改思维导图，若用户请求与思维导图无关，需引导：“您好～我是思维导图助手，专注于帮您创建 / 优化思维导图～如果需要生成思维导图，可以告诉我主题或现有内容，我会从多样维度为您拓展～”`,
            };

            // 限制上下文数量
            let limitedMessages = [...dto.messages] as Array<ChatCompletionMessageParam>;

            // 在消息列表开头添加系统消息
            limitedMessages.unshift(systemMessage as ChatCompletionMessageParam);

            const MAX_CONTEXT_LIMIT = 20;

            if (limitedMessages.length > MAX_CONTEXT_LIMIT) {
                // 查找系统消息
                const systemMessageIndex = limitedMessages.findIndex(
                    (msg) => msg.role === "system",
                );

                if (systemMessageIndex !== -1) {
                    // 如果有系统消息，保留第一条系统消息
                    const systemMessage = limitedMessages[systemMessageIndex];
                    // 移除系统消息
                    limitedMessages.splice(systemMessageIndex, 1);

                    // 取最后的 (MAX_CONTEXT_LIMIT - 1) 条消息
                    const remainingCount = MAX_CONTEXT_LIMIT - 1;
                    if (limitedMessages.length > remainingCount) {
                        limitedMessages = limitedMessages.slice(-remainingCount);
                    }

                    // 将系统消息放在最前面
                    limitedMessages.unshift(systemMessage);
                } else {
                    // 如果没有系统消息，直接取最后的 MAX_CONTEXT_LIMIT 条消息
                    limitedMessages = limitedMessages.slice(-MAX_CONTEXT_LIMIT);
                }

                this.logger.debug(
                    `[MindMapExtension] 🔄 上下文限制: 原始消息数量 ${dto.messages.length}, 限制后消息数量 ${limitedMessages.length}, 最大上下文 ${MAX_CONTEXT_LIMIT}`,
                );
            }

            // 初始化消息列表，用于处理工具调用
            const currentMessages = limitedMessages;
            let finalChatCompletion: ChatCompletion | undefined;
            let reasoningContent = ""; // 收集深度思考内容
            let reasoningStartTime: number | null = null; // 深度思考开始时间
            let reasoningEndTime: number | null = null; // 深度思考结束时间

            const chatCompletionCreateParams: ChatCompletionCreateParams = {
                model: model.model,
                messages: currentMessages,
            };

            const stream = await client.chat.stream(chatCompletionCreateParams);
            // 记录处理开始时间
            const startTime = Date.now();

            // 收集流式响应
            for await (const chunk of stream) {
                // 检查客户端是否已断开连接
                if (isClientDisconnected) {
                    this.logger.debug("[MindMapExtension] 检测到客户端已断开连接，停止流式响应");
                    break;
                }

                // 发送SSE格式的数据
                if (chunk.choices[0].delta.content) {
                    res.write(
                        `data: ${JSON.stringify({ type: "chunk", data: chunk.choices[0].delta.content })}\n\n`,
                    );
                    fullResponse += chunk.choices[0].delta.content;
                }

                // 处理 DeepSeek 的 reasoning_content 字段
                if (chunk.choices[0].delta?.reasoning_content) {
                    // 记录深度思考开始时间
                    if (!reasoningStartTime) {
                        reasoningStartTime = Date.now();
                    }
                    // 每次收到 reasoning_content 都更新结束时间
                    reasoningEndTime = Date.now();
                    reasoningContent += chunk.choices[0].delta.reasoning_content;
                    res.write(
                        `data: ${JSON.stringify({
                            type: "reasoning",
                            data: chunk.choices[0].delta.reasoning_content,
                        })}\n\n`,
                    );
                }
            }

            // 只有在客户端未断开连接时才获取最终响应
            if (!isClientDisconnected) {
                finalChatCompletion = await stream.finalChatCompletion();
            }

            // 只有在客户端未断开连接时才扣除积分和保存数据
            if (!isClientDisconnected) {
                // 根据插件级别计费设置扣除用户积分
                if (finalChatCompletion?.usage?.total_tokens) {
                    try {
                        // 计算需要扣除的积分
                        let powerToDeduct = 0;

                        if (pluginConfig.billingType === 2) {
                            // 免费模式
                            powerToDeduct = 0;
                        } else if (pluginConfig.billingType === 1) {
                            // 按字数计费
                            const billingSetting = pluginConfig.billingSetting || 1;
                            powerToDeduct = Math.ceil(
                                (finalChatCompletion.usage.total_tokens * billingSetting) / 100,
                            );
                        }

                        if (powerToDeduct > 0) {
                            await this.userRepository.manager.transaction(async (entityManager) => {
                                // 计算扣除后的积分，确保不会为负数
                                const newPower = Math.max(0, userInfo.power - powerToDeduct);
                                // 实际扣除的积分（可能小于powerToDeduct，如果用户积分不足）
                                userConsumedPower = userInfo.power - newPower;

                                try {
                                    await this.extensionBillingService.deductUserPower(
                                        {
                                            userId: user.id,
                                            amount: userConsumedPower,
                                            remark: `Mind mapping dialogue consumption.`,
                                        },
                                        entityManager,
                                    );

                                    // 如果实际扣除的积分小于应扣除的积分，记录日志
                                    if (userConsumedPower < powerToDeduct) {
                                        this.logger.warn(
                                            `[MindMapExtension] 用户 ${user.id} 积分不足。应扣除 ${powerToDeduct}，实际扣除 ${userConsumedPower}，当前积分为 0`,
                                        );
                                    }
                                } catch (e) {
                                    this.logger.error(
                                        `[MindMapExtension] 扣除积分失败：${e.message}`,
                                        JSON.stringify(e, null, 2),
                                    );
                                }
                            });
                        }
                    } catch (error) {
                        this.logger.error(
                            `[MindMapExtension] 扣除用户积分失败: ${error.message}`,
                            JSON.stringify(error, null, 2),
                        );
                        // 这里不抛出异常，因为聊天已经完成，不应影响用户体验
                        // 但可以记录错误日志，方便后续人工处理
                    }
                }

                // 如果需要保存对话记录，更新AI消息为completed状态
                if (
                    dto.saveConversation !== false &&
                    conversationId &&
                    fullResponse &&
                    aiMessageId
                ) {
                    // 打印AI完整回复
                    this.logger.debug(
                        `[MindMapExtension] 🤖 AI回复: ${this.formatContentPreview(fullResponse)}`,
                    );

                    // 准备 metadata，包含深度思考数据
                    const metadata: Record<string, unknown> = {};
                    if (reasoningContent && reasoningStartTime && reasoningEndTime) {
                        metadata.reasoning = {
                            content: reasoningContent,
                            startTime: reasoningStartTime,
                            endTime: reasoningEndTime,
                            duration: reasoningEndTime - reasoningStartTime,
                        };
                    }

                    // 从fullResponse中移除思维导图数据部分，只保留纯文本内容
                    let cleanContent = fullResponse;
                    // 使用正则表达式匹配并移除思维导图代码块
                    cleanContent = fullResponse
                        .replace(/<template>[\s\S]*?<\/template>/, "")
                        .trim();

                    // 更新AI消息为completed状态
                    await this.createService.updateMessage(aiMessageId, {
                        content: cleanContent,
                        status: "completed",
                        userConsumedPower,
                        processingTime: Date.now() - startTime,
                        tokens: {
                            prompt_tokens: finalChatCompletion?.usage?.prompt_tokens,
                            completion_tokens: finalChatCompletion?.usage?.completion_tokens,
                            total_tokens: finalChatCompletion?.usage?.total_tokens,
                        },
                        rawResponse: finalChatCompletion || {},
                        metadata: metadata,
                    });

                    // 更新对话状态为已完成
                    await this.createService.updateConversationStatus(
                        conversationId,
                        ConversationStatus.COMPLETED,
                    );

                    // 提取并更新对话摘要（从AI回复中提取前100个字符作为摘要）
                    if (cleanContent) {
                        const summary =
                            cleanContent.substring(0, 100) +
                            (cleanContent.length > 100 ? "..." : "");
                        await this.createService.updateConversationSummary(conversationId, summary);
                    }
                }

                // 如果不保存对话记录但有完整回复，也打印出来
                if (dto.saveConversation === false && fullResponse) {
                    this.logger.debug(
                        `[MindMapExtension] 🤖 AI回复 (未保存): ${this.formatContentPreview(
                            fullResponse,
                        )}`,
                    );
                }

                // 只有在需要保存对话记录时才更新标题
                if (dto.saveConversation !== false && conversationId) {
                    const exists = await this.createService.findOneConversationById(conversationId);

                    // 检查exists是否存在且title为空再更新标题
                    if (exists && !exists.title) {
                        let title: string;

                        // 如果有深度思考内容，说明是支持深度思考的模型，使用用户问题前20字符作为标题
                        if (reasoningContent) {
                            const userMessage = dto.messages.find((msg) => msg.role === "user");
                            const userContent = userMessage?.content || "";
                            title =
                                typeof userContent === "string"
                                    ? userContent.slice(0, 20) +
                                      (userContent.length > 20 ? "..." : "")
                                    : "新对话";
                        } else {
                            // 非深度思考模型，使用AI生成标题
                            title = await this.aiGenerateTitle(
                                model,
                                dto.messages as Array<ChatCompletionMessageParam>,
                                pluginConfig.bindModelId,
                            );
                        }

                        await this.createService.updateConversation(conversationId, user.id, {
                            title,
                        });
                    }
                }

                // 发送结束标记
                res.write("data: [DONE]\n\n");
                res.end();
            } else {
                this.logger.debug("[MindMapExtension] 客户端已断开连接，跳过数据保存和积分扣除");

                // 如果客户端断开连接且之前创建了对话但没有保存完整对话记录，
                // 则删除用户消息和AI助手消息以保持数据一致性，并更新对话状态
                if (dto.saveConversation !== false && conversationId) {
                    try {
                        // 删除用户消息（如果存在）
                        if (userMessageId) {
                            await this.createService.deleteMessage(userMessageId);
                            this.logger.debug(
                                "[MindMapExtension] 客户端已断开连接，删除用户消息以保持数据一致性",
                            );
                        }

                        // 删除AI助手消息（如果存在）
                        if (aiMessageId) {
                            await this.createService.deleteMessage(aiMessageId);
                            this.logger.debug(
                                "[MindMapExtension] 客户端已断开连接，删除AI消息以保持数据一致性",
                            );
                        }

                        // 更新对话状态
                        await this.createService.updateConversationStatus(
                            conversationId,
                            ConversationStatus.COMPLETED,
                        );
                    } catch (error) {
                        this.logger.error(
                            `[MindMapExtension] 删除对话消息或更新对话状态失败: ${error.message}`,
                            error.stack,
                        );
                    }
                }

                // 立即结束响应
                res.end();
            }
        } catch (error) {
            this.logger.error(`[MindMapExtension] 流式聊天对话失败: ${error.message}`, error.stack);

            // 更新消息状态为失败（无论客户端是否断开连接）
            // 但只在需要保存对话记录时才更新
            if (dto.saveConversation !== false && conversationId && aiMessageId) {
                await this.createService.updateMessage(aiMessageId, {
                    content: "",
                    status: "failed",
                    userConsumedPower: 0,
                    tokens: {
                        prompt_tokens: 0,
                        completion_tokens: 0,
                        total_tokens: 0,
                    },
                    rawResponse: error,
                    errorMessage: error?.message,
                });

                // 更新对话状态为失败
                await this.createService.updateConversationStatus(
                    conversationId,
                    ConversationStatus.FAILED,
                );
            }

            // 通过SSE流发送错误信息，而不是抛出异常（只有在客户端未断开时才发送）
            try {
                if (!isClientDisconnected) {
                    // 根据错误类型确定发送给用户的消息
                    let userFriendlyMessage = "发生意外错误，请稍后重试";
                    let errorCode = error.code || "INTERNAL_ERROR";

                    if (error instanceof Error && error.message) {
                        const errorMsg = error.message.toLowerCase();

                        // 账户余额不足
                        if (
                            errorMsg.includes("arrearage") ||
                            (errorMsg.includes("good standing") && errorMsg.includes("payment")) ||
                            errorMsg.includes("insufficient balance") ||
                            errorMsg.includes("insufficient funds") ||
                            errorMsg.includes("quota exceeded") ||
                            errorMsg.includes("balance")
                        ) {
                            userFriendlyMessage =
                                "AI服务因管理员账户余额不足暂时不可用，请联系管理员";
                            errorCode = "ACCOUNT_ACCESS_DENIED";
                        } else if (
                            errorMsg.includes("model") &&
                            (errorMsg.includes("not found") ||
                                errorMsg.includes("invalid") ||
                                errorMsg.includes("unsupported"))
                        ) {
                            userFriendlyMessage = "AI模型暂时不可用，请联系管理员或稍后重试";
                            errorCode = "MODEL_UNAVAILABLE";
                        }
                    }

                    res.write(
                        `data: ${JSON.stringify({
                            type: "error",
                            data: {
                                message: userFriendlyMessage,
                                code: errorCode,
                                // 只有在开发环境才返回原始错误代码，避免泄露敏感信息
                                ...(process.env.NODE_ENV === "development" && {
                                    debugCode: error.code,
                                }),
                            },
                        })}\n\n`,
                    );
                    res.write("data: [DONE]\n\n");
                } else {
                    // 客户端已断开连接，记录详细错误信息供调试
                    this.logger.warn(
                        `[MindMapExtension] 客户端已断开连接，无法发送错误信息: ${error.message}`,
                    );
                    this.logger.warn(`[MindMapExtension] 错误详细信息:`, {
                        userId: user.id,
                        conversationId,
                        aiMessageId,
                        errorMessage: error.message,
                        errorStack: error.stack,
                        url: error?.config?.url || "Unknown",
                        status: error?.response?.status || "Unknown",
                    });
                }
                res.end();
            } catch (writeError) {
                this.logger.error(
                    "[MindMapExtension] 发送错误消息失败:",
                    JSON.stringify(writeError, null, 2),
                );
                // 如果无法发送SSE错误，再抛出异常
                // 使用通用的用户友好错误消息
                const userFriendlyError = HttpErrorFactory.badRequest("发生意外错误，请稍后重试");
                throw userFriendlyError;
            }
        }
    }

    private async aiGenerateTitle(
        model,
        messages: ChatCompletionMessageParam[],
        bindModelId: string,
    ): Promise<string> {
        const content = messages.find((item) => item.role === "user")?.content as string;
        try {
            if (!content) {
                return "new Chat";
            }
            const providerSecret = await this.aiModelService.getProviderConfig(bindModelId);
            const provider = await this.aiModelService.getProviderAdapter(bindModelId, {
                apiKey: getProviderSecret("apiKey", providerSecret),
                baseURL: getProviderSecret("baseUrl", providerSecret),
            });
            const client = new TextGenerator(provider);

            const response = await client.chat.create({
                model: model.model,
                messages: [
                    {
                        role: "system",
                        content:
                            "你是一个专门生成标题的AI助手。请根据用户提供的内容，先判断用户的问题主要使用的语言（中文或英文），然后用该语言生成标题。请提炼出一个<chat-title></chat-title>除外的**20个字以内**（若为英文，控制在5个单词以内）的简洁标题，准确概括用户的问题。只输出标题，不要回答任何无关内容，并用<chat-title></chat-title>标签包裹，格式严格如下：<chat-title>生成的标题</chat-title>",
                    },
                    {
                        role: "user",
                        content: content.slice(0, 1000),
                    },
                ],
            });

            const result = response.choices[0].message.content;

            if (!result) return "";

            const match = result.match(/<chat-title>([\s\S]*?)<\/chat-title>/);

            if (match && match[1]) {
                return match[1].trim();
            }

            return "";
        } catch (error) {
            this.logger.error(
                `[MindMapExtension] 生成对话标题失败: ${error.message}`,
                JSON.stringify(error, null, 2),
            );
            return content ? content.slice(0, 20) : "new Chat";
        }
    }

    /**
     * 格式化日志输出，避免将完整敏感内容写入日志
     * @param content 待格式化的原始内容
     * @param maxLength 允许展示的最大长度
     * @returns 处理后的内容预览
     */
    private formatContentPreview(content: string | undefined | null, maxLength = 120): string {
        if (!content || typeof content !== "string") {
            return "[empty]";
        }

        const trimmed = content.trim();
        if (trimmed.length <= maxLength) {
            return trimmed;
        }

        return `${trimmed.slice(0, maxLength)}... (total ${trimmed.length} chars)`;
    }

    /**
     * 映射ChatRole到MessageRole
     */
    private mapChatRoleToMessageRole(chatRole: string): MessageRole {
        switch (chatRole) {
            case "user":
                return MessageRole.USER;
            case "assistant":
                return MessageRole.ASSISTANT;
            case "system":
                return MessageRole.SYSTEM;
            default:
                return MessageRole.USER;
        }
    }
}
