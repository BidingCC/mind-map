import { TextGenerator } from "@buildingai/ai-sdk/core/generator/text";
import { BaseController } from "@buildingai/base/controllers/base.controller";
import { ExtensionWebController } from "@buildingai/core/decorators";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { User } from "@buildingai/db/entities/user.entity";
import type { UserPlayground } from "@buildingai/db/interfaces/context.interface";
import { Repository } from "@buildingai/db/typeorm";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { HttpErrorFactory } from "@buildingai/errors";
import { PublicAiModelService } from "@buildingai/extension-sdk/modules/ai/services/ai-model.service";
import { ExtensionBillingService } from "@buildingai/extension-sdk/modules/billing/extension-billing.service";
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
            this.logger.error("An error occurred when processing an unfinished message:", error);
        }
    }

    /**
     * 流式聊天对话 - 专门为思维导图场景定制
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
            throw HttpErrorFactory.badRequest("User not found.");
        }

        // 标记客户端是否已断开连接
        let isClientDisconnected = false;

        // 监听客户端断开连接事件
        res.on("close", () => {
            isClientDisconnected = true;
            this.logger.debug("The client has disconnected");
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
            throw HttpErrorFactory.badRequest(
                "Mind map plugin configuration error. Please contact the administrator.",
            );
        }

        const provider = await this.aiModelService.getProvider(pluginConfig.bindModelId, [
            "apiKey",
            "baseUrl",
        ]);

        const model = await this.aiModelService.getModelInfo(pluginConfig.bindModelId);

        const hasSufficientPower = await this.extensionBillingService.hasSufficientPower(
            user.id,
            pluginConfig.billingSetting,
        );

        if (!hasSufficientPower) {
            throw HttpErrorFactory.badRequest(
                "Insufficient balance. Please recharge and try again.",
            );
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
                    this.logger.debug(`🙋 用户问题: ${userMessage.content}`);

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
                    this.logger.debug(`🙋 user questions (not saved): ${userMessage.content}`);
                }
            }

            // 获取当前思维导图数据（如果存在）
            let mindMapData = null;
            if (dto.mindMapId) {
                try {
                    const mindMapRecord = await this.createService.findOneById(dto.mindMapId);
                    mindMapData = mindMapRecord?.mindMapData || null;
                } catch (error) {
                    this.logger.warn(`Failed to obtain the mind map data: ${error.message}`);
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
                content: `你是一个专门的思维导图AI助手，只能用于创建和编辑思维导图，不能用于其他用途。

你的唯一任务是根据用户请求创建或修改思维导图，需要以Markdown格式返回，并且只能使用Markdown的标题和无序列表两种语法，可以支持多层嵌套。只需返回内容即可。请严格遵守以下规则：

【重要】在任何情况下都必须遵守以下输出格式：
1. 回复内容应该是用户容易理解的自然语言
2. 不要提及思维导图的数据结构、字段格式等技术细节
3. 不要说明你做了哪些技术层面的修复或改动
4. 只描述对用户有意义的内容变化和功能改进
5. 在返回思维导图Markdown数据前，必须添加友好的提示语告诉用户正在生成或更新思维导图
6. 如果用户要求在原有结构的基础上更新思维导图，你只需给出需要更改的节点，不需要从根节点开始
7. 必须使用<template></template>标签包裹Markdown数据，格式模仿以下样例：
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

严禁使用任何其他格式，包括但不限于：
- 严禁使用---作为分隔线
- 严禁使用**作为强调格式
- 严禁使用\`\`\`作为代码块
- 严禁在标题前添加数字编号如### **1.**
- 严禁在标题前添加任何特殊符号如>、-等

错误的输出格式（禁止使用）示例：
\`\`\`markdown
# 主题
- 分支1
\`\`\`
或者：
 --- ### **1. 游戏的历史** - **起源**：从古代棋类（如围棋、象棋）到现代电子游戏，游戏是人类社交与娱乐的重要形式。 - **电子游戏发展**： - 1972年《 pong 》（Pong）标志着商业电子游戏的开端。 ---

 【重要】更新类型判断规则（严格遵守）：
1. 全量更新（从头开始生成整个思维导图）：
   - 只能以单个#开头，表示重新生成整个思维导图
   - 不能在增量更新请求中使用单个#开头
2. 增量更新（在现有思维导图基础上修改）：
   - 必须以##或更多层级（###、####等）或列表项（-）开头
   - 不能以单个#开头
   - 增量更新时，必须以要更新的节点作为根节点
3. 目前只支持单个节点增量更新，如果用户要求修改多个节点需要提示不支持更新多个节点，并提示生成的思维导图将只包含第一个要修改的一个节点，其他节点将丢失
   - 比如用户要求"修改节点1和节点2"，则提示不支持修改多个节点，并返回节点1的思维导图
   - 注意！！必须要提示用户不支持更新多个节点以及生成的思维导图将只包含第一个要修改的一个节点，不然用户会不了解为什么只更新了第一个节点

返回内容结构：
提示语 + <template>思维导图Markdown数据</template> + 总结

全量更新输出样例：
"好的，我正在为您生成关于"游戏"的思维导图。以下是结构化的思维导图内容：\n\n<template>\n# 游戏\n## 游戏类型\n### 动作游戏\n### 角色扮演游戏（RPG）\n### 策略游戏\n### 射击游戏\n### 冒险解谜\n## 游戏平台\n### PC端\n### 主机（PlayStation/Xbox）\n### 移动端\n### 云游戏\n## 游戏文化\n### 电子竞技\n### 游戏直播\n### 社区与玩家社群\n### 衍生周边（动漫/手办）\n</template>\n\n思维导图已创建完成，包含游戏类型、平台和文化三个核心分支，并细化了常见的子分类。您可以通过添加具体游戏案例、技术细节或文化现象等内容进一步扩展。"
增量更新输出样例：
"好的，我将针对「周目标设定」模块进行优化升级，增强目标制定的科学性和可执行性：\n\n\n<template>\n## 周目标设定\n### 目标制定框架\n#### SMART原则应用\n- Specific（具体性）\n- Measurable（可衡量）\n- Achievable（可实现）\n- Relevant（相关性）\n- Time-bound（时限性）\n#### 目标分类体系\n- 工作目标（建议占比40-50%）\n- 学习目标（建议占比20-30%）\n- 健康目标（建议占比15-20%）\n- 个人发展（建议占比5-10%）\n### 目标拆解工具\n#### 时间块分配法\n- 按优先级划分时间占比\n- 设置关键里程碑节点\n#### 优先级矩阵\n- 紧急重要 quadrant\n- 重要不紧急 quadrant\n- 紧急不重要 quadrant\n- 不紧急不重要 quadrant\n### 目标校准机制\n#### 基准参考系\n- 上周完成率对比\n- 个人能力成长曲线\n- 环境变化因素评估\n#### 风险预案\n- 时间缓冲区设置（建议20%冗余）\n- 替代方案准备\n- 资源保障清单\n</template>\n\n思维导图已优化目标设定模块，新增SMART目标制定框架、时间分配比例建议和风险预案机制。通过引入优先级矩阵和目标拆解工具，帮助更科学地分配时间和资源。建议在使用时结合PDCA循环，在周复盘环节持续优化目标设定策略。"
增量更新多个节点输出样例：
由于目前只支持单个节点的增量更新，我将优先处理「游戏类型」的详细扩展。以下是更新后的内容：+ <template>思维导图Markdown数据</template> + 思维导图已更新，对游戏类型进行了全面细化，新增了各类型的子分类、核心特点、代表作品和游戏机制。内容涵盖了从动作到休闲的广泛谱系，突出了玩法多样性和用户体验差异。建议结合具体平台或文化背景，进一步补充案例分析和趋势洞察。

当前思维导图数据：
${mindMapData ? JSON.stringify(mindMapData, null, 2) : "当前没有思维导图数据"}

请严格按照用户请求创建或修改思维导图，如果用户请求与思维导图无关，请引导用户回到思维导图创建任务。`,
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
                    `🔄 context limit: original number of messages ${dto.messages.length}, restricted number of messages ${limitedMessages.length}, maximum context ${MAX_CONTEXT_LIMIT}`,
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
                    this.logger.debug(
                        "It is detected that the client has disconnected, and the streaming response is stopped",
                    );
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

            // 只有在客户端未断开连接时才扣除算力和保存数据
            if (!isClientDisconnected) {
                // 根据插件级别计费设置扣除用户算力
                if (finalChatCompletion?.usage?.total_tokens) {
                    try {
                        // 计算需要扣除的算力
                        let powerToDeduct = 0;

                        if (pluginConfig.billingType === 2) {
                            // 免费模式
                            powerToDeduct = 0;
                        } else if (pluginConfig.billingType === 1) {
                            // 按字数计费
                            const billingSetting = pluginConfig.billingSetting || 1;
                            // 按字符计费
                            powerToDeduct = Math.ceil(
                                (finalChatCompletion.usage.total_tokens * billingSetting) / 100,
                            );
                        }

                        if (powerToDeduct > 0) {
                            await this.userRepository.manager.transaction(async (entityManager) => {
                                // 计算扣除后的算力，确保不会为负数
                                const newPower = Math.max(0, userInfo.power - powerToDeduct);
                                // 实际扣除的算力（可能小于powerToDeduct，如果用户算力不足）
                                userConsumedPower = userInfo.power - newPower;

                                try {
                                    await this.extensionBillingService.deductUserPower(
                                        {
                                            userId: user.id,
                                            amount: userConsumedPower,
                                            remark: `Mind mapping dialogue consumption (model: ${model.name})`,
                                        },
                                        entityManager,
                                    );

                                    // 如果实际扣除的算力小于应扣除的算力，记录日志
                                    if (userConsumedPower < powerToDeduct) {
                                        this.logger.warn(
                                            `The user 's ${user.id} points are insufficient. ${powerToDeduct} should be deducted. The actual deduction is ${userConsumedPower}, and the current points are 0`,
                                        );
                                    }
                                } catch (e) {
                                    this.logger.error(`Failed to deduct points：${e.message}`);
                                }
                            });
                        }
                    } catch (error) {
                        this.logger.error(
                            `Failed to deduct user points: ${error.message}`,
                            error.stack,
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
                    this.logger.debug(`🤖 AI replies: ${fullResponse}`);

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
                    this.logger.debug(`🤖 AI reply (not saved): ${fullResponse}`);
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
                this.logger.debug(
                    "The client has disconnected, skipping data saving and deducting computing power",
                );

                // 如果客户端断开连接且之前创建了对话但没有保存完整对话记录，
                // 则删除用户消息和AI助手消息以保持数据一致性，并更新对话状态
                if (dto.saveConversation !== false && conversationId) {
                    try {
                        // 删除用户消息（如果存在）
                        if (userMessageId) {
                            await this.createService.deleteMessage(userMessageId);
                            this.logger.debug(
                                "The client has disconnected and deleted user messages to maintain data consistency",
                            );
                        }

                        // 删除AI助手消息（如果存在）
                        if (aiMessageId) {
                            await this.createService.deleteMessage(aiMessageId);
                            this.logger.debug(
                                "The client has disconnected and deleted the AI message to maintain data consistency",
                            );
                        }

                        // 更新对话状态
                        await this.createService.updateConversationStatus(
                            conversationId,
                            ConversationStatus.COMPLETED,
                        );
                    } catch (error) {
                        this.logger.error(
                            `Failed to delete the conversation message or update the conversation status: ${error.message}`,
                            error.stack,
                        );
                    }
                }

                // 立即结束响应
                res.end();
            }
        } catch (error) {
            this.logger.error(
                `The streaming chat conversation failed: ${error.message}`,
                error.stack,
            );

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
                    res.write(
                        `data: ${JSON.stringify({
                            type: "error",
                            data: {
                                message: error.message,
                                code: error.code || "INTERNAL_ERROR",
                            },
                        })}\n\n`,
                    );
                    res.write("data: [DONE]\n\n");
                }
                res.end();
            } catch (writeError) {
                this.logger.error("The error message failed to be sent:", writeError);
                // 如果无法发送SSE错误，再抛出异常
                throw HttpErrorFactory.badRequest(error.message);
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

            const provider = await this.aiModelService.getProvider(bindModelId, [
                "apiKey",
                "baseUrl",
            ]);
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
                `Failed to generate the dialogue title: ${error.message}`,
                error.stack,
            );
            return content ? content.slice(0, 20) : "new Chat";
        }
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
