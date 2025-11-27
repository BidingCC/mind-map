<script setup lang="ts">
/**
 * 前台AI思维导图创建、编辑页面
 * @description 和AI对话创建导图以及编辑导图
 */

import type { AiMessage } from "@buildingai/service/models/message";
import { useColorMode } from "@vueuse/core";
import { useDebounceFn } from "@vueuse/core";

import { uuid } from "../../../../../packages/web/buildingai-ui/app/utils";
import type { MindMapData, MindMapDataNode, MindMapRecord } from "../services/types/record";
import { apiChatStream, apiGetAiConversation } from "../services/web/ai-conversation";
import {
    apiGetMindMapDetailUser,
    apiGetMindMapExamplesUser,
    apiSaveMindMap,
    apiUpdateMindMapTitle,
} from "../services/web/create";

defineOptions({
    name: "MindMapCreatePage",
});

// 定义页面元信息
definePageMeta({
    name: "思维导图创建",
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const toast = useMessage();
const titleInput = shallowRef<HTMLInputElement | null>(null);

const isDrawerOpen = shallowRef(true);
const isEditingTitle = shallowRef(false);
const editableTitle = shallowRef("");
const promptText = shallowRef("");
const colorMode = useColorMode();
const record = ref<MindMapRecord | null>(null);
const mindMapId = (route.params as { id: string }).id;
const queryPaging = reactive({ page: 1, pageSize: 10 });
const pageTitle = shallowRef("");
const isStart = shallowRef(true);
const isEnd = shallowRef(true);
// AI正在输入状态
const isAiTyping = shallowRef(false);
const isAtBottom = shallowRef(true);
// 自动保存函数
const autoSaveTimer = shallowRef<NodeJS.Timeout | null>(null);
const isSaving = shallowRef(false);
const initTimer = shallowRef<NodeJS.Timeout | null>(null);
const firstRender = shallowRef(true);
// 用于滚动触底加载更多的响应式引用
const chatContainerRef = shallowRef<HTMLElement | null>(null);
const hasMoreHistory = shallowRef(false);
const isLoading = computed(() => status.value === "loading");
// 保存状态提示相关
const showSaveIndicator = shallowRef(false);
const saveIndicatorTimer = shallowRef<NodeJS.Timeout | null>(null);

// 右键菜单相关状态
const contextMenu = reactive({
    show: false,
    left: 0,
    top: 0,
    type: "node", // 'node' 或 'svg'
    node: null as any,
});

// 记录鼠标右键按下的位置
const mousedownPosition = reactive({
    x: 0,
    y: 0,
    isMousedown: false,
});

// 记录AI对话框配置
const aiConfig = ref({
    prologue: "",
    try: [] as Array<{ id: string; content: string }>,
    dialogText: "",
    enabledTry: true,
    enabledDialog: true,
});

// SimpleMindMap 实例
let mindMapInstance: any = null;
let MindMapConstructor: any = null;
let markdownParser: any = null;

// 保存思维导图的初始状态，用于回退
let mindMapInitialState: MindMapData | null = null;

// 在开始新的AI对话前保存当前思维导图状态
const saveMindMapState = () => {
    if (mindMapInstance) {
        mindMapInitialState = mindMapInstance.getData(true);
    }
};

// 回退到之前保存的思维导图状态
const restoreMindMapState = () => {
    if (mindMapInstance && mindMapInitialState) {
        // 重新设置数据
        mindMapInstance.renderer.setData(mindMapInitialState);
        mindMapInstance.render();

        // 同步更新记录中的数据
        if (record.value) {
            record.value.mindMapData = {
                root: mindMapInitialState.root,
            };
        }
    }
};

// 加载AI对话框配置
const loadAiConfig = async () => {
    try {
        const config = await apiGetMindMapExamplesUser();
        aiConfig.value.prologue = config.prologue ?? aiConfig.value.prologue;
        aiConfig.value.try = config.try ?? aiConfig.value.try;
        aiConfig.value.dialogText = config.dialogText ?? aiConfig.value.dialogText;
        aiConfig.value.enabledTry = config.enabledTry ?? aiConfig.value.enabledTry;
        aiConfig.value.enabledDialog = config.enabledDialog ?? aiConfig.value.enabledDialog;
    } catch (error) {
        console.error("加载AI配置失败:", error);
        toast.error(t("create.toast.loadFailed"));
    }
};

const selectExample = (index: number) => {
    if (!aiConfig.value.enabledTry) return;

    const example = aiConfig.value.try[index - 1];
    if (example && example.content) {
        promptText.value = example.content;
    }
};

const startEditingTitle = () => {
    isEditingTitle.value = true;
    editableTitle.value = pageTitle.value;
    nextTick(() => {
        if (titleInput.value) {
            titleInput.value.focus();
            titleInput.value.select();
        }
    });
};

const saveTitle = async () => {
    // 防止重复触发保存
    if (!isEditingTitle.value) return;

    if (editableTitle.value.trim()) {
        try {
            isEditingTitle.value = false;
            const result = await apiUpdateMindMapTitle(mindMapId, editableTitle.value);
            if (result) {
                pageTitle.value = editableTitle.value;
            } else {
                toast.error(t("create.drawer.saveTitleError"));
            }
        } catch (error) {
            console.error(error);
            toast.error(t("create.drawer.saveTitleError"));
        }
    }
    isEditingTitle.value = false;
};

const cancelEditingTitle = () => {
    isEditingTitle.value = false;
    editableTitle.value = "";
};

// 将promptText与input同步
watch(promptText, (newVal) => {
    input.value = newVal;
});

// 发送消息
const sendPrompt = async () => {
    if (!promptText.value.trim()) {
        toast.warning(t("create.drawer.sendEmpty"));
        return;
    }

    if (isLoading.value) return;

    try {
        // 在发送新的AI请求前保存当前思维导图状态
        saveMindMapState();
        // 显示AI正在输入状态
        isAiTyping.value = true;
        await handleSubmit(promptText.value);
        const userMessage = messages.value[messages.value.length - 2];
        if (userMessage && userMessage.role === "user" && !userMessage.createdAt) {
            userMessage.createdAt = new Date().toISOString();
        }

        promptText.value = "";
        scrollToBottom();
    } catch (err) {
        console.error("发送失败:", err);
        toast.error(t("create.toast.sendError"));
        // 隐藏AI正在输入状态
        isAiTyping.value = false;
    }
};

const handleStop = () => {
    // 停止AI流式响应
    stop();
    isAiTyping.value = false;
};

const {
    data: messagesData,
    pending: loading,
    refresh,
} = await useAsyncData(
    `chat-messages-${record.value?.aiChatRecordId}`,
    () => {
        if (record.value?.aiChatRecordId) {
            return apiGetAiConversation(record.value?.aiChatRecordId as string, queryPaging);
        }
        // 如果没有 aiChatRecordId，返回一个空的分页结果
        return Promise.resolve({
            items: [],
            total: 0,
            page: 1,
            pageSize: queryPaging.pageSize || 10,
            totalPages: 0,
        });
    },
    {
        transform: (data) => {
            data.items = data.items.reverse();
            hasMoreHistory.value =
                data.total > data.items.length + (messagesData.value?.items.length || 0);
            return data;
        },
        // 只有当 aiChatRecordId 存在时才启用自动获取数据
        immediate: !!record.value?.aiChatRecordId,
    },
);

const { messages, input, handleSubmit, stop, status } = useChat({
    id: mindMapId,
    api: apiChatStream,
    initialMessages: [],
    body: {
        get saveConversation() {
            const userStore = useUserStore();
            return !!userStore.userInfo?.id;
        },
        get conversationId() {
            return record.value?.aiChatRecordId || undefined;
        },
        get mindMapId() {
            return mindMapId;
        },
    },
    onError(err) {
        let message = err.message;

        // 尝试解析错误信息，如果解析失败则使用原始错误信息
        try {
            const errorObj = JSON.parse(err.message);
            if (errorObj && errorObj.message) {
                message = errorObj.message;

                // 针对第三方服务的账户欠费错误提供通用提示
                if (message.includes("Access denied") && message.includes("good standing")) {
                    message =
                        "AI service is currently unavailable. Please contact the administrator.";
                }
            }
        } catch (parseError) {
            // 如果解析失败，保持原始错误信息
            console.warn(parseError);
        }

        console.error("聊天错误:", message);
        toast.error(t("create.toast.sendError") + ": " + message);
        // 隐藏AI正在输入状态
        isAiTyping.value = false;
    },
    onUpdate(chunk) {
        if (chunk.type === "conversation_id" && chunk.data) {
            if (record.value) {
                record.value.aiChatRecordId = chunk.data;
            }
        }
    },
    onFinish(message) {
        // 为消息添加时间戳
        message.createdAt = new Date().toISOString();
        // 隐藏AI正在输入状态
        isAiTyping.value = false;
        // console.log("聊天完成:", message);

        scrollToBottom();
    },
});

// 实时监测流式响应内容，检测是否包含特定格式的代码块
let templateBuffer = ""; // 用于存储<template>代码块内容的缓冲区
let inTemplateBlock = false; // 标记是否在<template>代码块内
let lastProcessedContent = ""; // 存储上一次处理过的内容
let lastProcessedLine = ""; // 存储上一次处理过的行，用于逐步生成节点
let isFirstData = true; // 标记是否为首次设置数据
// const waitUid = ""; // 用于保存等待的UID
let contentBuffer = ""; // 用于处理可能被分段的内容

watch(
    () => messages.value,
    (newMessages) => {
        // 检查最后一条消息是否为AI回复且正在生成中
        if (newMessages.length > 0) {
            const lastMessage = newMessages[newMessages.length - 1];
            if (
                lastMessage &&
                lastMessage.role === "assistant" &&
                lastMessage.status === "active" &&
                lastMessage.content
            ) {
                // 检查是否有新的内容增加
                // 确保 content 是字符串类型再进行操作
                const currentContent =
                    typeof lastMessage.content === "string" ? lastMessage.content : "";

                if (currentContent.length > lastProcessedContent.length) {
                    // 获取新增的内容
                    const newContent = currentContent.substring(lastProcessedContent.length);
                    lastProcessedContent = currentContent;
                    // 将新内容添加到缓冲区
                    contentBuffer += newContent;
                    // 检查缓冲区中是否包含完整的开始标签
                    const templateStartIndex = contentBuffer.indexOf("<template>");
                    if (templateStartIndex !== -1) {
                        inTemplateBlock = true;
                        // 获取开始标签之后的内容
                        const contentAfterTemplate = contentBuffer.substring(
                            templateStartIndex + 10,
                        ); // 10是<template>的长度

                        // 检查是否包含结束标签
                        const templateEndIndex = contentAfterTemplate.indexOf("</template>");
                        if (templateEndIndex !== -1) {
                            // 提取模板内容
                            const templateContent = contentAfterTemplate.substring(
                                0,
                                templateEndIndex,
                            );
                            if (templateContent) {
                                // console.log("完整模板内容:", templateContent);
                                // 直接处理这个完整的内容块
                                const lines = templateContent.split("\n");
                                lines.forEach((line) => {
                                    if (line.trim() !== "") {
                                        processMarkdownLine(line);
                                    }
                                });
                            }
                            // 清除已处理的部分
                            contentBuffer = contentAfterTemplate.substring(templateEndIndex + 11); // 11是</template>的长度
                            inTemplateBlock = false;
                        } else {
                            // 只有开始标签，没有结束标签
                            templateBuffer = contentAfterTemplate;

                            // 输出当前缓冲区中的所有行
                            const lines = templateBuffer.split("\n");
                            for (let i = 0; i < lines.length - 1; i++) {
                                const line = lines[i];
                                if (line && line.trim() !== "") {
                                    processMarkdownLine(line);
                                }
                            }

                            // 保留最后一行作为下一次处理的缓冲
                            if (lines.length > 0) {
                                const lastLine = lines[lines.length - 1];
                                if (lastLine !== undefined) {
                                    templateBuffer = lastLine;
                                }
                            }
                            // 清空内容缓冲区
                            contentBuffer = "";
                        }
                    }
                    // 处理包含结束标签的情况
                    else if (contentBuffer.includes("</template>")) {
                        inTemplateBlock = false;
                        const templateEndIndex = contentBuffer.indexOf("</template>");
                        const contentBeforeEnd = contentBuffer.substring(0, templateEndIndex);
                        templateBuffer += contentBeforeEnd;

                        // 输出缓冲区中的剩余内容（不包括结束标签）
                        if (templateBuffer.trim() !== "") {
                            const lines = templateBuffer.split("\n");
                            // 只输出非空行，确保不输出任何标签
                            lines.forEach((line) => {
                                if (line.trim() !== "" && !line.includes("</template>")) {
                                    processMarkdownLine(line);
                                }
                            });
                        }

                        // 清除已处理的部分
                        contentBuffer = contentBuffer.substring(templateEndIndex + 11); // 11是</template>的长度
                        templateBuffer = "";
                    }
                    // 处理在模板块内部的内容
                    else if (inTemplateBlock) {
                        templateBuffer += contentBuffer;
                        contentBuffer = "";

                        // 按换行符切割内容
                        const lines = templateBuffer.split("\n");

                        // 输出除了最后一行的所有行
                        for (let i = 0; i < lines.length - 1; i++) {
                            const line = lines[i];
                            if (line && line.trim() !== "" && !line.includes("</template>")) {
                                processMarkdownLine(line);
                            }
                        }

                        // 保留最后一行作为下一次处理的缓冲
                        if (lines.length > 0) {
                            const lastLine = lines[lines.length - 1];
                            if (lastLine !== undefined) {
                                templateBuffer = lastLine;
                            }
                        }
                    }
                }
            }

            // 如果消息已完成，处理剩余的缓冲区内容并重置状态
            if (
                lastMessage &&
                lastMessage.role === "assistant" &&
                lastMessage.status === "completed"
            ) {
                inTemplateBlock = false;
                templateBuffer = "";
                contentBuffer = "";
                lastProcessedContent = "";
                lastProcessedLine = "";
                isFirstData = true;
            }
        }
    },
    { deep: true },
);

// 处理单行Markdown内容并逐步生成思维导图节点
const processMarkdownLine = async (line: string) => {
    if (!mindMapInstance || !markdownParser) return;

    // console.log("处理Markdown行:", line);

    try {
        // 将当前行添加到已处理行中
        const currentContent = lastProcessedLine ? `${lastProcessedLine}\n${line}` : line;
        lastProcessedLine = currentContent;

        // 判断更新类型：
        // 以#开头（只有一个#）表示从头生成整个思维导图（全量更新）
        // 以##或更多层级开头或列表项（以-开头）表示对现有思维导图的增量更新
        const trimmedLine = line.trim();
        const isFullRegeneration = trimmedLine.startsWith("#") && !trimmedLine.startsWith("##");
        const isIncrementalUpdate = trimmedLine.startsWith("##") || trimmedLine.startsWith("-");

        // 只处理有效的Markdown行（标题或列表项），忽略说明性文本
        if (!trimmedLine.startsWith("#") && !trimmedLine.startsWith("-")) {
            return;
        }

        // 将当前累积的Markdown内容转换为思维导图数据
        let mindMapData: MindMapDataNode;
        try {
            mindMapData = await markdownParser.transformMarkdownTo(currentContent);
            addUid(mindMapData);
            // console.log("当前累积的Markdown内容:", currentContent);
            // console.log("转换后的思维导图数据:", mindMapData);
        } catch (parseError) {
            console.warn("Markdown解析失败:", parseError);
            // 使用默认结构继续
            mindMapData = {
                data: { text: currentContent.trim() || "节点", uid: uuid() },
                children: [],
            };
        }

        // 验证转换后的数据是否有效
        if (!mindMapData || typeof mindMapData !== "object") {
            console.warn("转换后的思维导图数据无效:", mindMapData);
            return;
        }

        // 确保数据有必要的结构
        if (!mindMapData.data) {
            mindMapData.data = { text: "节点", uid: uuid() };
        }

        if (!Array.isArray(mindMapData.children)) {
            mindMapData.children = [];
        }

        if (isFullRegeneration) {
            // 全量更新 - 从头开始生成整个思维导图
            if (isFirstData) {
                mindMapInstance.command.addHistory();
                mindMapInstance.renderer.setData(mindMapData);
                mindMapInstance.render();
                isFirstData = false;
            } else {
                // 即使是全量更新，如果不是第一次，也使用updateData以避免闪烁
                mindMapInstance.updateData(mindMapData);
            }
        } else if (isIncrementalUpdate) {
            // 增量更新 - 在现有节点基础上更新
            // 需要找到目标节点并更新其子节点
            await incrementallyUpdateMindMap(mindMapData);
        } else {
            // 默认情况，使用updateData进行更新
            mindMapInstance.updateData(mindMapData);
        }

        // 更新记录中的数据
        if (record.value) {
            record.value.mindMapData = {
                root: mindMapData,
            };
        }

        // 触发自动保存
        handleAutoSave();
    } catch (error) {
        console.warn("处理单行Markdown时出错:", error);
        // 即使出错也继续处理，避免阻塞
    }
};

// 增量更新思维导图
const incrementallyUpdateMindMap = async (newData: MindMapDataNode) => {
    if (!mindMapInstance || !newData) return;

    try {
        // 获取当前完整的思维导图数据
        const currentData: MindMapDataNode = mindMapInstance.getData();

        // 确保有根节点数据
        if (!currentData || !currentData.data) {
            console.warn("当前思维导图数据无效");
            return;
        }

        // 如果新数据没有根节点，或者根节点没有文本，则无法进行匹配
        if (!newData.data || !newData.data.text) {
            console.warn("新数据缺少根节点或文本内容");
            mindMapInstance.updateData(newData);
            return;
        }

        // 获取第一层子节点作为要更新的内容
        const updateNodes: MindMapDataNode[] = newData.children || [];

        // 查找匹配的节点进行更新
        const targetNodeText = newData.data.text;
        const updatedData: MindMapDataNode | null = findAndUpdateNode(
            currentData,
            targetNodeText,
            updateNodes,
        );

        if (updatedData) {
            // 使用更新后的数据更新思维导图
            mindMapInstance.updateData(updatedData);
        } else {
            console.warn(`未找到匹配的节点: ${targetNodeText}`);
            // 如果未找到匹配节点，则直接更新整个数据
            mindMapInstance.updateData(newData);
        }
    } catch (error) {
        console.error("增量更新思维导图时出错:", error);
    }
};

// 在思维导图数据中查找并更新指定节点
const findAndUpdateNode = (
    data: MindMapDataNode,
    targetText: string,
    newChildren: MindMapDataNode[],
): MindMapDataNode | null => {
    if (!data) return null;

    // 深拷贝当前数据以避免直接修改
    const result = JSON.parse(JSON.stringify(data));

    // 递归查找并更新节点
    const updateNode = (node: any): boolean => {
        if (!node || !node.data) return false;

        // 检查当前节点是否匹配目标节点
        if (node.data.text === targetText) {
            // 更新子节点
            node.children = newChildren || [];
            return true;
        }

        // 递归检查子节点
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                if (updateNode(child)) {
                    return true;
                }
            }
        }

        return false;
    };

    // 执行更新操作
    const updated = updateNode(result);

    // 如果找到了匹配的节点并更新了它，返回更新后的数据
    return updated ? result : null;
};

// 添加UID
const addUid = (data: MindMapDataNode) => {
    if (!data) return;
    const checkRepeatUiMap: Record<string, string> = {};
    const walk = (node: any, pUid = "") => {
        // 确保节点数据存在
        if (!node) return;
        if (!node.data) {
            node.data = {};
        }
        if (!node.data.uid) {
            const key = pUid + "-" + (node.data.text || "");
            // 如果映射中已存在该key，则复用uid，否则生成新的uid
            if (checkRepeatUiMap[key]) {
                node.data.uid = checkRepeatUiMap[key];
            } else {
                const newUid = uuid();
                node.data.uid = newUid;
                checkRepeatUiMap[key] = newUid;
            }
        } else {
            // 如果节点已经有uid，则更新映射表
            const key = pUid + "-" + (node.data.text || "");
            checkRepeatUiMap[key] = node.data.uid;
        }

        // 递归处理子节点
        if (node.children && node.children.length > 0) {
            node.children.forEach((child: MindMapDataNode) => {
                if (child) {
                    walk(child, node.data.uid);
                }
            });
        }
    };
    walk(data);
};

// 自动滚动到底部
const scrollToBottom = () => {
    if (chatContainerRef.value) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.value;
        // AUTO_SCROLL_THRESHOLD: 当用户距离底部小于该值时，认为用户在底部附近
        // 即使用户稍微向上滚动了一点，但仍在底部附近时，有新消息仍会自动滚动
        const AUTO_SCROLL_THRESHOLD = 50;

        // 只有当用户在底部附近或者之前就在底部时才自动滚动
        if (isAtBottom.value || scrollHeight - scrollTop - clientHeight <= AUTO_SCROLL_THRESHOLD) {
            nextTick(() => {
                if (chatContainerRef.value) {
                    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
                }
                isAtBottom.value = true;
            });
        }
    }
};

// 监听聊天容器的滚动事件，检查用户是否在底部
const handleChatScroll = () => {
    if (chatContainerRef.value) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.value;
        // USER_AT_BOTTOM_THRESHOLD: 当用户距离底部小于该值时，认为用户在底部
        // 用于精确判断用户是否真的在查看底部内容
        const USER_AT_BOTTOM_THRESHOLD = 10;
        // 如果用户距离底部小于某个阈值，则认为在底部
        isAtBottom.value = scrollHeight - scrollTop - clientHeight <= USER_AT_BOTTOM_THRESHOLD;
    }
};

// 当从服务器获取到历史消息后，更新 useChat 的消息
watch(
    messagesData,
    (newMessagesData) => {
        if (newMessagesData?.items && newMessagesData.items.length > 0) {
            // 将历史消息设置为初始消息
            const historyMessages = newMessagesData.items.map((item: AiMessage) => ({
                id: item.id || uuid(),
                conversationId: item.conversationId,
                role: item.role,
                content: item.errorMessage || item.content,
                messageType: item.messageType,
                status: item.errorMessage ? ("failed" as const) : ("completed" as const),
                errorMessage: item.errorMessage,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            }));

            // 只有当 messages 还没有内容时才设置初始消息
            if (messages.value.length === 0) {
                messages.value = [...historyMessages];
            } else {
                // 检查是否已经存在相同ID的消息，避免重复
                const uniqueHistoryMessages = historyMessages.filter(
                    (historyMsg) =>
                        !messages.value.some((existingMsg) => existingMsg.id === historyMsg.id),
                );

                if (uniqueHistoryMessages.length > 0) {
                    messages.value = [...uniqueHistoryMessages, ...messages.value];
                }
            }
        }

        // 页面加载历史消息后自动滚动到底部
        scrollToBottom();
    },
    { immediate: true },
);

// 加载更多消息
const loadMoreMessages = async () => {
    if (loading.value) return;

    if (!hasMoreHistory.value && messagesData.value?.items.length) {
        return;
    }

    queryPaging.page++;

    try {
        const newData = await apiGetAiConversation(
            record.value?.aiChatRecordId as string,
            queryPaging,
        );

        hasMoreHistory.value =
            newData.total > newData.items.length + (messagesData.value?.items.length || 0);

        // 如果有新数据，将其添加到现有数据前面（因为是倒序显示）
        if (newData.items.length > 0) {
            const reversedItems = newData.items.reverse();
            if (messagesData.value) {
                // 检查是否已经存在相同ID的消息，避免重复
                const uniqueNewItems = reversedItems.filter(
                    (newItem) =>
                        !messagesData.value?.items.some(
                            (existingItem) => existingItem.id === newItem.id,
                        ),
                );

                messagesData.value.items = [...uniqueNewItems, ...messagesData.value.items];

                // 同步更新 useChat 的 messages 数组，确保新加载的历史消息也能发送给大模型
                const historyMessages = messagesData.value.items.map((item: AiMessage) => ({
                    id: item.id || uuid(),
                    conversationId: item.conversationId,
                    role: item.role,
                    content: item.errorMessage || item.content,
                    messageType: item.messageType,
                    status: item.errorMessage ? ("failed" as const) : ("completed" as const),
                    errorMessage: item.errorMessage,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                }));

                // 更新 useChat 中的消息列表，只保留非completed状态的消息（即用户刚发送但AI还未回复的消息）
                const nonCompletedMessages = messages.value.filter(
                    (msg) => msg.status !== "completed",
                );

                // 过滤掉重复的消息
                const uniqueHistoryMessages = historyMessages.filter(
                    (historyMsg) =>
                        !nonCompletedMessages.some(
                            (existingMsg) => existingMsg.id === historyMsg.id,
                        ),
                );

                messages.value = [...uniqueHistoryMessages, ...nonCompletedMessages];
            }
        }
    } catch (error) {
        console.error("加载更多消息失败:", error);
        toast.error(t("create.toast.loadMoreFailed"));
        queryPaging.page--;
    }
};

// 用于显示的消息（整合历史消息和实时消息，并处理分页逻辑）
const displayedMessages = computed(() => {
    // 如果没有历史消息数据，显示所有消息
    if (!messagesData.value) {
        return messages.value || [];
    }

    // 如果是第一页（初始状态），只显示最新的10条历史消息 + 所有新消息
    if (queryPaging.page === 1) {
        const historyMessages = (messagesData.value.items || [])
            .map((item) => ({
                id: item.id,
                ...item,
                content: item.errorMessage || item.content,
                status: item.errorMessage ? "failed" : item.status,
            }))
            .slice(0, 10);

        const newMessages = messages.value || [];
        // 过滤掉已在历史消息中包含的消息，避免重复显示
        const uniqueNewMessages = newMessages.filter(
            (newMsg) => !historyMessages.some((historyMsg) => historyMsg.id === newMsg.id),
        );
        return [...historyMessages, ...uniqueNewMessages];
    }

    // 如果加载了更多历史消息，显示所有历史消息 + 所有新消息
    const historyMessages = (messagesData.value.items || []).map((item) => ({
        id: item.id,
        ...item,
        content: item.errorMessage || item.content,
        status: item.errorMessage ? "failed" : item.status,
    }));

    const newMessages = messages.value || [];
    // 过滤掉已在历史消息中包含的消息，避免重复显示
    const uniqueNewMessages = newMessages.filter(
        (newMsg) => !historyMessages.some((historyMsg) => historyMsg.id === newMsg.id),
    );
    return [...historyMessages, ...uniqueNewMessages];
});

// 显示右键菜单
const showContextMenu = (e: MouseEvent, type: string, node?: any) => {
    contextMenu.show = true;
    contextMenu.left = e.clientX;
    contextMenu.top = e.clientY;
    contextMenu.type = type;
    contextMenu.node = node || null;

    // 阻止默认右键菜单
    e.preventDefault();
};

// 隐藏右键菜单
const hideContextMenu = () => {
    contextMenu.show = false;
};

// 复制节点
const copyNode = () => {
    if (mindMapInstance) {
        mindMapInstance.renderer.copy();
        hideContextMenu();
    }
};

// 剪切节点
const cutNode = () => {
    if (mindMapInstance) {
        mindMapInstance.renderer.cut();
        hideContextMenu();
    }
};

// 粘贴节点
const pasteNode = () => {
    if (mindMapInstance) {
        mindMapInstance.renderer.paste();
        hideContextMenu();
    }
};

// 跟踪选中状态
interface SelectedNodeInfo {
    hasSelectedNode: boolean;
    isSelectedRootNode: boolean;
    node: any[]; // simple-mind-map的Node类型
}

const selectedNodeInfo = ref<SelectedNodeInfo>({
    hasSelectedNode: false,
    isSelectedRootNode: false,
    node: [],
});

// 视图变换状态跟踪
const isViewTransforming = shallowRef(false);
const viewTransformTimer = shallowRef<NodeJS.Timeout | null>(null);

// 计算悬浮窗位置
const nodeFloatPosition = computed(() => {
    if (!selectedNodeInfo.value.node || selectedNodeInfo.value.node.length === 0)
        return { top: 0, left: 0 };

    // 如果只有一个节点
    if (selectedNodeInfo.value.node.length === 1) {
        const node = selectedNodeInfo.value.node[0];
        if (!node || typeof node.getRect !== "function") return { top: 0, left: 0 };

        // 使用 getRectInSvg 获取节点在 SVG 中的准确位置
        const rectInSvg = node.getRectInSvg ? node.getRectInSvg() : null;
        if (rectInSvg) {
            // 直接使用 SVG 坐标（这些坐标已经考虑了缩放和位移）
            const top = rectInSvg.top - rectInSvg.height;
            const left = rectInSvg.left + rectInSvg.width / 2;
            return { top, left };
        } else {
            return { top: 0, left: 0 };
        }
    }

    // 如果有多个节点，计算所有选中节点的边界框
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    const svgRects = [];

    for (const node of selectedNodeInfo.value.node) {
        if (node && typeof node.getRect === "function") {
            if (node.getRectInSvg) {
                const rectInSvg = node.getRectInSvg();
                svgRects.push(rectInSvg);
            } else {
                break;
            }
        }
    }

    // 使用 SVG 坐标计算
    svgRects.forEach((rectInSvg) => {
        minX = Math.min(minX, rectInSvg.left);
        minY = Math.min(minY, rectInSvg.top - rectInSvg.height);
        maxX = Math.max(maxX, rectInSvg.left + rectInSvg.width);
        maxY = Math.max(maxY, rectInSvg.top + rectInSvg.height);
    });

    // 悬浮窗显示在选中区域上方中央
    const top = minY;
    const left = (minX + maxX) / 2;

    return { top, left };
});

// 初始化思维导图
const initializeMindMap = (mindData: MindMapDataNode, layoutType: string) => {
    // 销毁之前的实例
    if (mindMapInstance) {
        mindMapInstance.destroy();
        mindMapInstance = null;
    }

    const container = document.getElementById("mindmap-container");
    if (container) {
        container.innerHTML = "";
    }

    // 使用保存的构造函数引用
    if (MindMapConstructor) {
        // 根据当前系统主题设置思维导图主题
        const isDarkMode =
            colorMode.value === "dark" ||
            (colorMode.value === "auto" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);

        const themeConfig = isDarkMode
            ? {
                  backgroundColor: "#0D0D0D",
                  lineColor: "#cccccc",
                  lineStyle: "curve",
                  lineWidth: 2,
                  root: {
                      fillColor: "#4E47F6",
                  },
                  second: {
                      borderColor: "#4E47F6",
                  },
              }
            : {
                  backgroundColor: "#ffffff",
                  lineColor: "#444444",
                  lineStyle: "curve",
                  lineWidth: 2,
                  root: {
                      fillColor: "#4E47F6",
                  },
                  second: {
                      borderColor: "#4E47F6",
                  },
              };

        // 确保初始数据结构完整
        const validMindData =
            mindData && typeof mindData === "object"
                ? mindData
                : {
                      data: {
                          text: "未命名导图",
                          uid: uuid(),
                      },
                      children: [],
                  };

        mindMapInstance = new MindMapConstructor({
            el: document.getElementById("mindmap-container"),
            data: validMindData,
            layout: layoutType,
            readonly: false,
            themeConfig,
            textAutoWrapWidth: 500,
            fit: true,
            createNewNodeBehavior: "activeOnly",
        });

        // 监听视图变化事件（滚动、缩放等）
        mindMapInstance.on("view_data_change", () => {
            updateNodeFloatPosition();
        });

        // 监听窗口大小变化事件
        mindMapInstance.on("resize", () => {
            requestAnimationFrame(() => {
                updateNodeFloatPosition();
                updateNodeSelectionStatus();
            });
        });

        // 监听节点选择状态变化
        mindMapInstance.on("node_active", () => {
            updateNodeSelectionStatus();
        });

        // 监听节点右键事件
        mindMapInstance.on("node_contextmenu", (e: MouseEvent, node: any) => {
            if (!isAiTyping.value) {
                showContextMenu(e, "node", node);
            }
        });

        // 监听画布鼠标按下事件
        mindMapInstance.on("svg_mousedown", (e: MouseEvent) => {
            // 如果不是右键点击直接返回
            if (e.which !== 3) {
                return;
            }
            mousedownPosition.x = e.clientX;
            mousedownPosition.y = e.clientY;
            mousedownPosition.isMousedown = true;
        });

        // 监听鼠标松开事件
        mindMapInstance.on("mouseup", (e: MouseEvent) => {
            if (!mousedownPosition.isMousedown) {
                return;
            }
            mousedownPosition.isMousedown = false;
            // 如果鼠标松开和按下的距离大于3，则不认为是点击事件
            if (
                Math.abs(mousedownPosition.x - e.clientX) > 3 ||
                Math.abs(mousedownPosition.y - e.clientY) > 3
            ) {
                hideContextMenu();
                return;
            }
            if (!isAiTyping.value) {
                showContextMenu(e, "svg");
            }
        });

        // 监听其他需要隐藏菜单的事件
        mindMapInstance.on("node_click", hideContextMenu);
        mindMapInstance.on("draw_click", hideContextMenu);
        mindMapInstance.on("expand_btn_click", hideContextMenu);

        // 监听历史记录变化事件
        mindMapInstance.on("back_forward", (index: number, len: number) => {
            isStart.value = index <= 0;
            isEnd.value = index >= len - 1;
        });

        // 监听数据变化事件
        mindMapInstance.on("data_change", () => {
            if (!firstRender.value) {
                handleAutoSave();
            }
        });

        // 监听详细数据变化事件，用于获取新创建的节点
        // mindMapInstance.on("data_change_detail", (list: any[]) => {
        //     // 找出新创建节点中的最后一个
        //     const lastCreate = list
        //         .filter((item) => {
        //             return item.action === "create";
        //         })
        //         .pop(); // 使用pop获取最后一个创建的节点

        //     if (lastCreate && lastCreate.data) {
        //         const uid = lastCreate.data.data?.uid;
        //         if (uid) {
        //             const node = mindMapInstance.renderer.findNodeByUid(uid);
        //             if (node) {
        //                 mindMapInstance.renderer.moveNodeToCenter(node);
        //             } else {
        //                 waitUid = uid;
        //             }
        //         }
        //     }
        // });

        // 监听节点树渲染完成事件
        // mindMapInstance.on("node_tree_render_end", () => {
        //     if (waitUid) {
        //         const uid = waitUid;
        //         waitUid = "";
        //         const node = mindMapInstance.renderer.findNodeByUid(uid);
        //         if (node) {
        //             mindMapInstance.renderer.moveNodeToCenter(node);
        //         }
        //     }
        // });

        // 确保容器尺寸正确
        const containerEl = document.getElementById("mindmap-container");
        if (containerEl) {
            containerEl.style.overflow = "hidden";
        }

        if (initTimer.value) {
            clearTimeout(initTimer.value);
        }
        initTimer.value = setTimeout(() => {
            firstRender.value = false;
            initTimer.value = null;
        }, 1000);
    } else {
        console.error("初始化思维导图失败");
        toast.error(t("create.toast.loadInitMindMapFailed"));
    }
};

const updateMindMapTheme = () => {
    if (!mindMapInstance || !record.value) return;

    // 根据当前系统主题设置思维导图主题
    const isDarkMode =
        colorMode.value === "dark" ||
        (colorMode.value === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    const themeConfig = isDarkMode
        ? {
              backgroundColor: "#0D0D0D",
              lineColor: "#cccccc",
              lineStyle: "curve",
              lineWidth: 2,
              root: {
                  fillColor: "#4E47F6",
              },
              second: {
                  borderColor: "#4E47F6",
              },
          }
        : {
              backgroundColor: "#ffffff",
              lineColor: "#444444",
              lineStyle: "curve",
              lineWidth: 2,
              root: {
                  fillColor: "#4E47F6",
              },
              second: {
                  borderColor: "#4E47F6",
              },
          };

    mindMapInstance.setThemeConfig(themeConfig);
};

// 更新节点选中状态
const updateNodeSelectionStatus = () => {
    if (!mindMapInstance) {
        selectedNodeInfo.value = {
            hasSelectedNode: false,
            isSelectedRootNode: false,
            node: [],
        };
        return;
    }

    const activeNodeList = mindMapInstance.renderer.activeNodeList;
    const hasSelectedNode = activeNodeList.length > 0;
    const isSelectedRootNode =
        hasSelectedNode && activeNodeList[0].uid === mindMapInstance.getData().data.uid;

    selectedNodeInfo.value = {
        hasSelectedNode,
        isSelectedRootNode,
        node: activeNodeList,
    };

    // 强制更新节点悬浮窗位置
    requestAnimationFrame(() => {
        // 触发重新计算节点悬浮窗位置
        selectedNodeInfo.value = { ...selectedNodeInfo.value };
    });
};

// 检查是否有选中的节点
const hasSelectedNode = computed(() => {
    return selectedNodeInfo.value.hasSelectedNode;
});

// 检查选中的是否是根节点
const isSelectedRootNode = computed(() => {
    return selectedNodeInfo.value.isSelectedRootNode;
});

// 撤销操作
const handleUndo = () => {
    if (mindMapInstance) {
        mindMapInstance.execCommand("BACK");
    }
};

// 重做操作
const handleRedo = () => {
    if (mindMapInstance) {
        mindMapInstance.execCommand("FORWARD");
    }
};

// 添加同级节点
const addNode = () => {
    if (mindMapInstance) {
        mindMapInstance.execCommand("INSERT_NODE");
    }
};

// 添加子节点
const addChildNode = () => {
    if (mindMapInstance && selectedNodeInfo.value.node && selectedNodeInfo.value.node.length > 0) {
        mindMapInstance.execCommand("INSERT_CHILD_NODE");
    }
};

// 删除节点
const removeNode = () => {
    if (mindMapInstance && selectedNodeInfo.value.node && selectedNodeInfo.value.node.length > 0) {
        mindMapInstance.execCommand("REMOVE_NODE");
    }
};

const handleDownload = async () => {
    // 下载操作
    if (mindMapInstance) {
        try {
            mindMapInstance.export("png", true, pageTitle.value);
        } catch (error) {
            console.error("下载图片时出错:", error);
            toast.error(t("create.drawer.downloadError"));
        }
    } else {
        toast.warning(t("create.toast.noData"));
    }
};

// 居中显示根节点
const centerRootNode = () => {
    if (mindMapInstance) {
        const rootNode = mindMapInstance.renderer.root;
        if (rootNode) {
            mindMapInstance.renderer.moveNodeToCenter(rootNode, true);
        }
    }
};

const loadMindMap = async () => {
    try {
        record.value = await apiGetMindMapDetailUser(mindMapId);
        pageTitle.value = record.value.description;
        initializeMindMap(record.value.mindMapData.root, record.value.mindMapData.layout as string);
    } catch (e) {
        toast.error(t("create.toast.loadMindMapFailed"));
        console.warn("获取思维导图详情失败:", e);
    }
};

const toggleDrawer = () => {
    isDrawerOpen.value = !isDrawerOpen.value;
};

const handleAutoSave = () => {
    if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
    }
    autoSaveTimer.value = setTimeout(() => {
        saveMindMapData();
    }, 1500);
};

// 保存思维导图数据
const saveMindMapData = async () => {
    if (isSaving.value || !mindMapInstance) return;

    isSaving.value = true;

    try {
        // 获取完整的思维导图数据
        const fullData = mindMapInstance.getData(true);
        const res = await apiSaveMindMap({
            id: mindMapId,
            mindMapData: fullData,
            updatedAt: new Date(),
        });
        if (res) {
            // 显示保存成功提示
            showSaveIndicator.value = true;

            // 清理之前的定时器（如果存在）
            if (saveIndicatorTimer.value) {
                clearTimeout(saveIndicatorTimer.value);
            }

            // 设置新的定时器
            saveIndicatorTimer.value = setTimeout(() => {
                showSaveIndicator.value = false;
                saveIndicatorTimer.value = null;
            }, 2000);
        } else {
            toast.error(t("create.drawer.saveError"));
        }
    } catch (error) {
        console.error("保存思维导图时出错:", error);
        toast.error(t("create.drawer.saveError"));
    } finally {
        isSaving.value = false;
    }
};

// 监听AI输入状态和消息变化，自动滚动到底部
watch(
    [isAiTyping, messages],
    () => {
        if (isAiTyping.value && chatContainerRef.value) {
            scrollToBottom();
        }
    },
    { deep: true },
);

// 更改字体大小
const changeFontSize = (e: string) => {
    if (mindMapInstance && selectedNodeInfo.value.node && selectedNodeInfo.value.node.length > 0) {
        selectedNodeInfo.value.node.forEach((node) => {
            if (node && typeof node.setStyle === "function") {
                node.setStyle("fontSize", parseInt(e));
            }
        });
    }
};

// 定义字体映射关系常量
const FONT_FAMILY_MAP: Record<string, string> = {
    宋体: "宋体, SimSun, Songti SC",
    微软雅黑: "微软雅黑, Microsoft YaHei, 微软雅黑体, Microsoft YaHei UI",
    楷体: "楷体, KaiTi, 楷体_GB2312",
    黑体: "黑体, SimHei, Heiti SC",
    隶书: "隶书, LiSu, 隶书-简",
    "Andale Mono": "Andale Mono, monospace",
    Arial: "Arial, Helvetica, sans-serif",
    "Aria Black": "Arial Black, Arial Bold, Gadget, sans-serif",
    "Comic Sans Ms": "Comic Sans MS, Comic Sans, cursive",
    Impact: "Impact, Charcoal, sans-serif",
    "Times New Roman": "Times New Roman, Times, serif",
    "Sans-Serif": "Sans-Serif, sans-serif",
    serif: "serif",
};

// 更改字体
const changeFontFamily = (e: string) => {
    if (mindMapInstance && selectedNodeInfo.value.node && selectedNodeInfo.value.node.length > 0) {
        const fontFamilyValue = FONT_FAMILY_MAP[e] || e;
        selectedNodeInfo.value.node.forEach((node) => {
            if (node && typeof node.setStyle === "function") {
                node.setStyle("fontFamily", fontFamilyValue);
            }
        });
    }
};

// 获取当前节点字体族的简化名称，用于下拉框显示
const getCurrentFontFamilyLabel = () => {
    if (!selectedNodeInfo.value.node || selectedNodeInfo.value.node.length === 0) return "微软雅黑";

    // 使用第一个节点的字体作为显示值
    const firstNode = selectedNodeInfo.value.node[0];
    if (!firstNode || typeof firstNode.getStyle !== "function") return "微软雅黑";
    const firstNodeFontFamily = firstNode.getStyle("fontFamily") || "微软雅黑";

    // 精确匹配完整字体栈
    for (const [fontLabel, fontStack] of Object.entries(FONT_FAMILY_MAP)) {
        if (firstNodeFontFamily === fontStack) {
            return fontLabel;
        }
    }

    // 模糊匹配 - 检查当前字体是否是某个字体栈的组成部分
    for (const [fontLabel, fontStack] of Object.entries(FONT_FAMILY_MAP)) {
        if (
            firstNodeFontFamily === fontStack ||
            fontStack.startsWith(firstNodeFontFamily) ||
            fontStack.includes(firstNodeFontFamily)
        ) {
            return fontLabel;
        }
    }

    // 反向模糊匹配 - 检查当前字体栈是否包含已知字体
    for (const [fontLabel] of Object.entries(FONT_FAMILY_MAP)) {
        if (firstNodeFontFamily.startsWith(fontLabel) || firstNodeFontFamily.includes(fontLabel)) {
            return fontLabel;
        }
    }

    // 如果没有匹配项，尝试提取第一个字体作为显示名称
    const firstFont = firstNodeFontFamily.split(",")[0].trim();
    return firstFont || "微软雅黑";
};

// 更改背景色
const changeBackgroundColor = (value: string) => {
    if (mindMapInstance && selectedNodeInfo.value.node && selectedNodeInfo.value.node.length > 0) {
        selectedNodeInfo.value.node.forEach((node) => {
            if (node && typeof node.setStyle === "function") {
                node.setStyle("fillColor", value);
            }
        });
    }
};

// 更改边框颜色
const changeBorderColor = (value: string) => {
    if (mindMapInstance && selectedNodeInfo.value.node && selectedNodeInfo.value.node.length > 0) {
        selectedNodeInfo.value.node.forEach((node) => {
            if (node && typeof node.setStyle === "function") {
                node.setStyle("borderColor", value);
            }
        });
    }
};

// 更改字体颜色
const changeFontColor = (value: string) => {
    if (mindMapInstance && selectedNodeInfo.value.node && selectedNodeInfo.value.node.length > 0) {
        selectedNodeInfo.value.node.forEach((node) => {
            if (node && typeof node.setStyle === "function") {
                node.setStyle("color", value);
            }
        });
    }
};

// 处理窗口大小变化
const handleResize = useDebounceFn(() => {
    if (mindMapInstance) {
        mindMapInstance.resize();
    }
}, 300);

// 更新节点操作悬浮窗位置
const updateNodeFloatPosition = () => {
    // 标记视图正在变换
    isViewTransforming.value = true;

    // 清除之前的定时器
    if (viewTransformTimer.value) {
        clearTimeout(viewTransformTimer.value);
    }

    // 设置新的定时器，在视图变换结束后显示悬浮窗
    viewTransformTimer.value = setTimeout(() => {
        isViewTransforming.value = false;
        viewTransformTimer.value = null;
    }, 300);

    // 强制触发重新计算悬浮窗位置
    if (selectedNodeInfo.value.node && selectedNodeInfo.value.node.length > 0) {
        // 通过修改一个响应式变量来触发重新计算
        selectedNodeInfo.value = { ...selectedNodeInfo.value };
    }
};

onMounted(async () => {
    if (import.meta.client) {
        // 动态导入 simple-mind-map 和插件
        const MindMapModule = await import("simple-mind-map");
        const MindMap = MindMapModule.default || MindMapModule;

        // 保存构造函数引用
        MindMapConstructor = MindMap;

        // 导入Markdown解析器
        try {
            // @ts-expect-error - 动态导入的模块类型定义不完整
            markdownParser = (await import("simple-mind-map/src/parse/markdown.js")).default;
        } catch (e) {
            console.warn("Markdown解析器加载失败:", e);
        }

        try {
            // 注册插件
            // @ts-expect-error - 动态导入的插件模块类型定义不完整
            const Export = (await import("simple-mind-map/src/plugins/Export")).default;
            // @ts-expect-error - 动态导入的插件模块类型定义不完整
            const Drag = (await import("simple-mind-map/src/plugins/Drag")).default;
            // @ts-expect-error - 动态导入的插件模块类型定义不完整
            const Select = (await import("simple-mind-map/src/plugins/Select")).default;

            MindMap.usePlugin(Export);
            MindMap.usePlugin(Drag);
            MindMap.usePlugin(Select);
        } catch (e) {
            console.warn("部分插件加载失败:", e);
        }
        // 加载AI配置
        await loadMindMap();
        await loadAiConfig();
        // 加载AI对话记录
        refresh();
        document.addEventListener("click", hideContextMenu);

        // 监听主题变化并更新思维导图主题
        watch(colorMode, () => {
            updateMindMapTheme();
        });

        // 监听窗口大小变化，实时调整思维导图大小
        window.addEventListener("resize", handleResize);

        // 监听思维导图的变换事件，更新悬浮窗位置
        if (mindMapInstance) {
            mindMapInstance.on("view_data_change", updateNodeFloatPosition);
        }
    }
});

onUnmounted(() => {
    if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value);
    }
    if (initTimer.value) {
        clearTimeout(initTimer.value);
    }
    if (saveIndicatorTimer.value) {
        clearTimeout(saveIndicatorTimer.value);
    }
    if (viewTransformTimer.value) {
        clearTimeout(viewTransformTimer.value);
    }
    if (mindMapInstance) {
        mindMapInstance.destroy();
        mindMapInstance = null;
    }
    document.removeEventListener("click", hideContextMenu);
    window.removeEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
    if (isAiTyping.value) {
        stop();
        restoreMindMapState();
    }
});
</script>

<template>
    <div class="bg-background relative h-full w-full overflow-hidden">
        <!-- 思维导图显示区域 -->
        <div id="mindmap-container" class="h-full w-full"></div>

        <!-- 节点操作悬浮窗 -->
        <div
            v-show="
                selectedNodeInfo.node &&
                selectedNodeInfo.node.length > 0 &&
                !isViewTransforming &&
                !isAiTyping
            "
            class="bg-background absolute z-100 flex items-center gap-2 rounded-lg border p-2 shadow-lg"
            :style="{
                top: nodeFloatPosition.top + 'px',
                left: nodeFloatPosition.left + 'px',
                transform: 'translate(-50%, -100%)',
            }"
        >
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-plus"
                @click="addNode"
                :disabled="!hasSelectedNode || isSelectedRootNode || isAiTyping"
            >
                <span class="whitespace-nowrap">{{ t("create.toolbar.addSibling") }}</span>
            </UButton>
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-corner-down-right"
                @click="addChildNode"
                :disabled="!hasSelectedNode || isAiTyping"
            >
                <span class="whitespace-nowrap">{{ t("create.toolbar.addChild") }}</span>
            </UButton>
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash"
                @click="removeNode"
                :disabled="!hasSelectedNode || isAiTyping"
                :title="t('create.toolbar.delete')"
            >
            </UButton>
            <!-- 节点样式设置按钮 -->
            <div class="flex items-center gap-2">
                <USelect
                    @update:model-value="changeFontSize"
                    :disabled="isAiTyping"
                    :model-value="
                        selectedNodeInfo.node &&
                        selectedNodeInfo.node.length > 0 &&
                        selectedNodeInfo.node[0] &&
                        typeof selectedNodeInfo.node[0].getStyle === 'function'
                            ? selectedNodeInfo.node[0].getStyle('fontSize') || '16'
                            : '16'
                    "
                    :items="[
                        { label: '10', value: '10' },
                        { label: '12', value: '12' },
                        { label: '14', value: '14' },
                        { label: '16', value: '16' },
                        { label: '18', value: '18' },
                        { label: '24', value: '24' },
                        { label: '32', value: '32' },
                        { label: '48', value: '48' },
                    ]"
                    :ui="{ content: 'min-w-fit' }"
                />
                <USelect
                    @update:model-value="changeFontFamily"
                    :disabled="isAiTyping"
                    :model-value="getCurrentFontFamilyLabel()"
                    :items="
                        Object.entries(FONT_FAMILY_MAP).map(([label, value]) => ({
                            label,
                            value: label,
                        }))
                    "
                    :ui="{ content: 'min-w-fit' }"
                />
                <span class="whitespace-nowrap">{{ t("create.toolbar.backgroundColor") }}</span>
                <UInput
                    class="w-10"
                    :disabled="isAiTyping"
                    :model-value="
                        selectedNodeInfo.node &&
                        selectedNodeInfo.node.length > 0 &&
                        selectedNodeInfo.node[0] &&
                        typeof selectedNodeInfo.node[0].getStyle === 'function'
                            ? selectedNodeInfo.node[0].getStyle('fillColor') || '#ffffff'
                            : '#ffffff'
                    "
                    @update:model-value="changeBackgroundColor"
                    type="color"
                    :ui="{ base: 'px-1 py-0' }"
                />
                <span class="whitespace-nowrap">{{ t("create.toolbar.borderColor") }}</span>
                <UInput
                    class="w-10"
                    :disabled="isAiTyping"
                    :model-value="
                        selectedNodeInfo.node &&
                        selectedNodeInfo.node.length > 0 &&
                        selectedNodeInfo.node[0] &&
                        typeof selectedNodeInfo.node[0].getStyle === 'function'
                            ? selectedNodeInfo.node[0].getStyle('borderColor') || '#000000'
                            : '#000000'
                    "
                    @update:model-value="changeBorderColor"
                    type="color"
                    :ui="{ base: 'px-1 py-0' }"
                />
                <span class="whitespace-nowrap">{{ t("create.toolbar.textColor") }}</span>
                <UInput
                    class="w-10"
                    :disabled="isAiTyping"
                    :model-value="
                        selectedNodeInfo.node &&
                        selectedNodeInfo.node.length > 0 &&
                        selectedNodeInfo.node[0] &&
                        typeof selectedNodeInfo.node[0].getStyle === 'function'
                            ? selectedNodeInfo.node[0].getStyle('color') || '#000000'
                            : '#000000'
                    "
                    @update:model-value="changeFontColor"
                    type="color"
                    :ui="{ base: 'px-1 py-0' }"
                />
            </div>
        </div>

        <!-- 左上角浮动控制栏 -->
        <div
            class="bg-background absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg p-2 shadow-md"
        >
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-left"
                @click="router.back()"
            >
                {{ t("create.toolbar.back") }}
            </UButton>
            <div class="border-l border-(--border) px-2 text-lg">
                <span v-if="!isEditingTitle" @dblclick="startEditingTitle" class="cursor-pointer">
                    {{ pageTitle }}
                </span>
                <input
                    v-else
                    v-model="editableTitle"
                    @blur="saveTitle"
                    @keyup.enter="saveTitle"
                    @keyup.esc="cancelEditingTitle"
                    ref="titleInput"
                    class="border-b focus:border-(--color-primary) focus:outline-none"
                    type="text"
                />
            </div>
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-undo"
                :disabled="isStart || isAiTyping"
                @click="handleUndo"
            >
                {{ t("create.toolbar.undo") }}
            </UButton>
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-redo"
                :disabled="isEnd || isAiTyping"
                @click="handleRedo"
            >
                {{ t("create.toolbar.redo") }}
            </UButton>
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-download"
                :disabled="isAiTyping"
                @click="handleDownload"
            >
                {{ t("create.toolbar.download") }}
            </UButton>
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-plus"
                @click="addNode"
                :disabled="!hasSelectedNode || isSelectedRootNode || isAiTyping"
            >
                {{ t("create.toolbar.addSibling") }}
            </UButton>
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-corner-down-right"
                @click="addChildNode"
                :disabled="!hasSelectedNode || isAiTyping"
            >
                {{ t("create.toolbar.addChild") }}
            </UButton>
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash"
                @click="removeNode"
                :disabled="!hasSelectedNode || isAiTyping"
            >
                {{ t("create.toolbar.delete") }}
            </UButton>
            <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-maximize"
                :disabled="isAiTyping"
                @click="centerRootNode"
            >
                {{ t("create.toolbar.center") }}
            </UButton>
        </div>

        <!-- 保存状态提示图标 -->
        <div
            v-if="showSaveIndicator"
            class="bg-background absolute bottom-4 left-4 z-10 flex items-center rounded-lg p-2 text-green-500"
        >
            <UIcon name="i-lucide-check-circle-2" class="h-7 w-7" />
        </div>

        <!-- 右键菜单 -->
        <div
            v-show="contextMenu.show"
            class="absolute z-200 min-w-[120px] rounded-md border border-(--border) bg-(--secondary) shadow-lg"
            :style="{ left: contextMenu.left + 'px', top: contextMenu.top + 'px' }"
        >
            <button
                v-if="contextMenu.type === 'node'"
                class="block w-full px-4 py-2 text-left text-sm hover:bg-(--accent)"
                @click="copyNode"
            >
                {{ t("create.contextMenu.copy") }}
            </button>
            <button
                v-if="contextMenu.type === 'node'"
                class="block w-full px-4 py-2 text-left text-sm hover:bg-(--accent)"
                @click="cutNode"
            >
                {{ t("create.contextMenu.cut") }}
            </button>
            <button
                class="block w-full px-4 py-2 text-left text-sm hover:bg-(--accent)"
                @click="pasteNode"
            >
                {{ t("create.contextMenu.paste") }}
            </button>
        </div>

        <!-- AI对话抽屉 -->
        <div
            v-if="isDrawerOpen"
            class="fixed inset-y-0 right-0 z-50 flex w-[30rem] min-w-[20rem] transform transition-transform duration-300 ease-in-out"
            :class="{ 'translate-x-0': isDrawerOpen, 'translate-x-full': !isDrawerOpen }"
        >
            <div
                class="flex h-full w-full flex-col border-l border-(--border) bg-(--background) shadow-lg"
            >
                <!-- 抽屉头部 -->
                <div class="flex w-full shrink-0 items-center justify-between p-6 pb-2">
                    <h2 class="flex items-center text-lg font-medium">
                        <span
                            class="mr-2 inline-flex rounded-full bg-linear-to-b from-blue-500 to-blue-300 p-2"
                        >
                            <UIcon name="i-lucide-sparkles" class="text-white" />
                        </span>
                        {{ t("create.drawer.title") }}
                    </h2>
                    <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-x"
                        @click="toggleDrawer"
                    />
                </div>

                <!-- 抽屉内容 -->
                <div class="flex min-h-0 flex-1 flex-col">
                    <div
                        class="flex-1 overflow-y-auto p-6 pb-0"
                        ref="chatContainerRef"
                        @scroll="handleChatScroll"
                    >
                        <!-- 开场白 -->
                        <div class="mb-4 flex flex-row gap-3">
                            <!-- 消息气泡 -->
                            <div class="flex max-w-[80%] flex-col items-start">
                                <div
                                    class="bg-muted prose prose-neutral dark:prose-invert max-w-none rounded-lg px-3 py-2 text-sm"
                                >
                                    <div v-html="aiConfig.prologue"></div>
                                </div>
                            </div>
                        </div>

                        <!-- 聊天消息显示区域 -->
                        <div class="mb-4 space-y-4 overflow-y-auto">
                            <!-- 点击回顾历史消息 -->
                            <div v-if="hasMoreHistory" class="text-center">
                                <UButton
                                    variant="ghost"
                                    size="xs"
                                    @click="loadMoreMessages"
                                    :loading="loading"
                                >
                                    {{ t("create.drawer.review") }}
                                </UButton>
                            </div>

                            <div
                                v-for="(message, index) in displayedMessages"
                                :key="message.id || index"
                                class="flex gap-3"
                                :class="{
                                    'flex-row-reverse': message.role === 'user',
                                    'flex-row': message.role !== 'user',
                                }"
                            >
                                <!-- 消息气泡 -->
                                <div
                                    class="flex max-w-[80%] flex-col"
                                    :class="{
                                        'items-end': message.role === 'user',
                                        'items-start': message.role !== 'user',
                                    }"
                                >
                                    <div
                                        class="rounded-lg px-3 py-2 text-sm break-all"
                                        :class="{
                                            'bg-primary text-primary-foreground':
                                                message.role === 'user',
                                            'bg-muted': message.role !== 'user',
                                            'text-white': message.role === 'user',
                                            'border border-red-200 bg-red-100 text-red-800':
                                                message.status === 'failed',
                                        }"
                                    >
                                        <div
                                            v-if="message.status === 'failed'"
                                            class="flex items-start gap-2"
                                        >
                                            <UIcon
                                                name="i-lucide-alert-circle"
                                                class="mt-0.5 shrink-0"
                                            />
                                            <span>{{ t("create.toast.sendError") }}</span>
                                        </div>
                                        <div
                                            v-else-if="
                                                message.role !== 'user' &&
                                                isAiTyping &&
                                                index === displayedMessages.length - 1
                                            "
                                        >
                                            <!-- AI正在输入效果：当没有文字内容时显示三个跳动的点，有文字内容时显示闪烁光标 -->
                                            <span
                                                v-if="message.content"
                                                v-dompurify-html="message.content"
                                            ></span>
                                            <span
                                                v-if="!message.content"
                                                class="loading-dots-container"
                                            >
                                                <span
                                                    class="loading-dot"
                                                    style="animation-duration: 1.4s"
                                                ></span>
                                                <span
                                                    class="loading-dot"
                                                    style="
                                                        animation-duration: 1.4s;
                                                        animation-delay: 0.1s;
                                                    "
                                                ></span>
                                                <span
                                                    class="loading-dot"
                                                    style="
                                                        animation-duration: 1.4s;
                                                        animation-delay: 0.2s;
                                                    "
                                                ></span>
                                            </span>
                                            <span
                                                v-else
                                                class="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-(--muted-foreground) align-middle"
                                            ></span>
                                        </div>
                                        <div v-else v-dompurify-html="message.content"></div>
                                    </div>
                                    <div class="text-muted-foreground mt-1 text-xs">
                                        <TimeDisplay
                                            v-if="message.createdAt"
                                            :datetime="new Date(message.createdAt)"
                                            mode="datetime"
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- 加载指示器 -->
                            <div v-if="loading && !hasMoreHistory" class="flex justify-center">
                                <UIcon name="i-lucide-loader-circle" class="h-6 w-6 animate-spin" />
                            </div>
                        </div>
                    </div>

                    <!-- 抽屉底部输入区域 -->
                    <div class="t-1 sticky bottom-0 shrink-0 bg-(--background) p-4">
                        <!-- 试一试 -->
                        <template v-if="aiConfig.enabledTry">
                            <div class="mb-4 text-sm">
                                {{ t("create.drawer.try") }}
                            </div>

                            <div class="mb-4 space-y-2 text-sm">
                                <div
                                    v-for="(item, index) in aiConfig.try"
                                    :key="item.id"
                                    class="w-fit cursor-pointer rounded-lg border border-(--border) p-2 transition-colors hover:border-(--color-primary)"
                                    @click="selectExample(index + 1)"
                                >
                                    {{ item.content }}
                                </div>
                            </div>
                        </template>

                        <div class="relative w-full">
                            <UTextarea
                                id="ai-prompt"
                                v-model="promptText"
                                :rows="1"
                                autoresize
                                :maxrows="4"
                                :disabled="isLoading"
                                class="w-full"
                                :placeholder="
                                    aiConfig.enabledDialog
                                        ? aiConfig.dialogText
                                        : t('create.drawer.inputPlaceholder')
                                "
                                :ui="{
                                    base: 'py-3 pl-3 pr-12 text-[16px]',
                                }"
                                @keydown.enter.exact.prevent="sendPrompt"
                            />
                            <div class="absolute right-2 bottom-2 flex gap-1">
                                <UButton
                                    v-if="isLoading"
                                    color="neutral"
                                    variant="ghost"
                                    class="flex h-8 w-8 items-center justify-center rounded-full p-0"
                                    @click="handleStop"
                                >
                                    <UIcon name="i-lucide-stop-circle" class="h-4 w-4" />
                                </UButton>
                                <UButton
                                    v-else
                                    color="primary"
                                    variant="solid"
                                    class="flex h-8 w-8 items-center justify-center rounded-full p-0"
                                    @click="sendPrompt"
                                >
                                    <UIcon name="i-lucide-arrow-up" class="h-4 w-4" />
                                </UButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 右上角AI对话按钮 -->
        <div
            v-if="!isDrawerOpen"
            class="bg-background fixed top-4 right-4 z-10 flex items-center gap-2 rounded-lg p-2 shadow-md"
        >
            <UButton
                color="primary"
                variant="solid"
                icon="i-lucide-message-circle"
                @click="toggleDrawer"
                :title="t('create.drawer.title')"
            />
        </div>
    </div>
</template>

<style scoped>
/* 添加与BdEditor组件中相同的富文本样式 */
.prose :deep(h1) {
    font-size: 1.5rem !important;
    margin: 1rem 0 0.5rem !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
}

.prose :deep(h2) {
    font-size: 1.35rem !important;
    margin: 1rem 0 0.5rem !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
}

.prose :deep(h3) {
    font-size: 1.2rem !important;
    margin: 1rem 0 0.5rem !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
}

.prose :deep(h4) {
    font-size: 1.1rem !important;
    margin: 1rem 0 0.5rem !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
}

.prose :deep(h5),
.prose :deep(h6) {
    font-size: 1rem !important;
    margin: 1rem 0 0.5rem !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
}

.prose :deep(p) {
    margin: 0 0 0.75rem !important;
}

.prose :deep(p):last-child {
    margin-bottom: 0 !important;
}

.prose :deep(ul),
.prose :deep(ol) {
    padding-left: 1.25rem !important;
    margin: 0.5rem 0 0.75rem !important;
}

.prose :deep(ul) {
    list-style: disc !important;
}

.prose :deep(ol) {
    list-style: decimal !important;
}

.prose :deep(li) {
    margin: 0.25rem 0 !important;
}

.prose :deep(blockquote) {
    border-left: 3px solid #e5e7eb !important;
    padding-left: 0.75rem !important;
    margin: 0.75rem 0 !important;
    color: inherit !important;
}

.prose :deep(code) {
    font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
        monospace !important;
    background-color: #f3f4f6 !important;
    border-radius: 4px !important;
    padding: 0.15em 0.35em !important;
    font-size: 0.9em !important;
}

.prose :deep(pre) {
    background-color: #111827 !important;
    color: #e5e7eb !important;
    border-radius: 6px !important;
    padding: 0.75rem 1rem !important;
    overflow: auto !important;
    margin: 0.75rem 0 1rem !important;
}

.prose :deep(pre code) {
    background: transparent !important;
    color: inherit !important;
    padding: 0 !important;
    font-size: 0.95em !important;
}

/* AI加载点的从左到右光影效果 */
.loading-dots-container {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.loading-dot {
    height: 0.5rem;
    width: 0.5rem;
    border-radius: 50%;
    background-color: #9ca3af; /* gray-400 */
    animation: pulse 1.4s infinite ease-in-out;
    animation-fill-mode: both;
}

.loading-dot:nth-child(1) {
    animation-delay: -0.3s;
}

.loading-dot:nth-child(2) {
    animation-delay: -0.15s;
}

.loading-dot:nth-child(3) {
    animation-delay: 0s;
}

@keyframes pulse {
    0%,
    60%,
    100% {
        background-color: #9ca3af; /* gray-400 */
        transform: scale(1);
    }
    30% {
        background-color: #ffffff; /* 产生光影效果 */
        transform: scale(1.2);
    }
}
</style>
