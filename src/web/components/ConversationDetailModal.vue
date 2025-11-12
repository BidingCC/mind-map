<script setup lang="ts">
import type { AiMessage } from "@buildingai/service/models/message";
import type { MessageContent } from "@buildingai/types";

import type { AiChatRecord } from "../models/ai-record";
import type { MindMapRecord } from "../models/record";

const emits = defineEmits<{
    close: [];
}>();

defineProps<{
    conversationDetail: AiChatRecord | null;
    conversationMessages: AiMessage[];
    conversationMessagesLoading: boolean;
    mindMap?: MindMapRecord;
    hasMoreMessages: boolean;
    loadMoreMessages: () => void;
}>();

const { t } = useI18n();

/**
 * 获取消息角色显示文本
 */
function getMessageRoleDisplay(role: string): string {
    const roleMap: Record<string, string> = {
        user: t("console.records.user"),
        assistant: t("console.records.assistant"),
    };
    return roleMap[role] || role;
}

/**
 * 获取消息角色样式
 */
function getMessageRoleClass(role: string): string {
    const styleMap: Record<string, string> = {
        user: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        assistant: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return styleMap[role] || "bg-gray-100 text-gray-800";
}

/**
 * 格式化日期
 */
const formatDate = (date: string | Date) => {
    if (!date) return "-";
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "-";
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const hour = dateObj.getHours().toString().padStart(2, "0");
    const minute = dateObj.getMinutes().toString().padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
};

/**
 * 将MessageContent转换为字符串
 */
function formatMessageContent(content: MessageContent): string {
    // 如果是字符串，直接返回
    if (typeof content === "string") {
        return content;
    }

    // 如果是数组，处理每部分内容
    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (part.type === "text") {
                    return part.text || "";
                }
                // 对于其他类型，返回类型的描述
                return `[${part.type} content]`;
            })
            .join("\n");
    }

    // 其他情况，转换为JSON字符串
    return JSON.stringify(content);
}
</script>

<template>
    <BdModal
        :title="t('console.records.conversationDetail')"
        :description="t('console.records.viewAiChatDetails')"
        :ui="{
            content: 'max-w-4xl',
            body: 'max-h-[80vh] overflow-y-auto',
        }"
        @close="emits('close')"
    >
        <div
            v-if="!conversationDetail && conversationMessagesLoading"
            class="flex items-center justify-center"
            style="height: 644px"
        >
            <UIcon name="i-lucide-loader-2" class="size-8 animate-spin" />
        </div>

        <div v-else-if="conversationDetail" class="space-y-6">
            <!-- 对话基本信息 -->
            <div class="bg-muted rounded-lg p-4">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label class="text-accent-foreground text-sm font-medium">{{
                            t("console.records.drawName")
                        }}</label>
                        <p class="text-secondary-foreground mt-1 text-sm">
                            {{ mindMap?.description || "-" }}
                        </p>
                    </div>
                    <div>
                        <label class="text-accent-foreground text-sm font-medium">{{
                            t("console.records.userInfo")
                        }}</label>
                        <p class="text-secondary-foreground mt-1 text-sm">
                            {{ mindMap?.userName || "-" }}
                        </p>
                    </div>
                    <div>
                        <label class="text-accent-foreground text-sm font-medium">{{
                            t("console.records.messagesCount")
                        }}</label>
                        <p class="text-secondary-foreground mt-1 text-sm">
                            {{ conversationDetail?.messageCount || 0 }}
                        </p>
                    </div>
                    <div>
                        <label class="text-accent-foreground text-sm font-medium">{{
                            t("console.records.creationTime")
                        }}</label>
                        <p class="text-secondary-foreground mt-1 text-sm">
                            <span v-if="conversationDetail?.createdAt">
                                {{ formatDate(conversationDetail?.createdAt) }}
                            </span>
                            <span v-else>-</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- 消息列表 -->
            <div>
                <h3 class="mb-3 text-lg font-semibold">
                    {{ t("console.records.conversationInfo") }} ({{ conversationMessages.length }})
                </h3>

                <div class="space-y-4">
                    <BdScrollArea class="h-full min-h-0 w-full">
                        <BdInfiniteScroll
                            :threshold="300"
                            :loading="conversationMessagesLoading"
                            :has-more="hasMoreMessages"
                            @load-more="loadMoreMessages"
                        >
                            <div
                                v-for="message in conversationMessages"
                                :key="message.id"
                                class="mb-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                            >
                                <!-- 消息头部 -->
                                <div class="mb-2 flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span
                                            :class="getMessageRoleClass(message.role)"
                                            class="rounded-full px-2 py-1 text-xs font-medium"
                                        >
                                            {{ getMessageRoleDisplay(message.role) }}
                                        </span>
                                        <TimeDisplay
                                            v-if="message.createdAt"
                                            :datetime="new Date(message.createdAt)"
                                            mode="datetime"
                                            class="text-muted-foreground text-xs"
                                        />
                                    </div>

                                    <!-- 消息统计 -->
                                    <div
                                        class="text-muted-foreground flex items-center gap-4 text-xs"
                                    >
                                        <span
                                            v-if="
                                                message.userConsumedPower !== undefined &&
                                                message.role === 'assistant'
                                            "
                                            class="flex items-center gap-1"
                                        >
                                            <UIcon name="i-lucide-hash" class="h-3 w-3" />
                                            {{ t("console.records.total") }}
                                            {{ message.userConsumedPower || 0 }}
                                            {{ t("console.records.power") }}
                                        </span>
                                        <span v-if="message.tokens" class="flex items-center gap-1">
                                            <UIcon name="i-lucide-hash" class="h-3 w-3" />
                                            {{ t("console.records.total") }}
                                            {{ message.tokens.total_tokens }} Tokens
                                        </span>
                                    </div>
                                </div>

                                <!-- 消息内容 -->
                                <div class="prose prose-sm dark:prose-invert max-w-none">
                                    <BdMarkdown :content="formatMessageContent(message.content)" />
                                </div>

                                <!-- 元数据 -->
                                <div
                                    v-if="
                                        message.metadata && Object.keys(message.metadata).length > 0
                                    "
                                    class="mt-3 border-t border-gray-100 pt-3 dark:border-gray-600"
                                >
                                    <details class="text-xs">
                                        <summary class="text-muted-foreground cursor-pointer">
                                            {{ t("console.records.metadata") }}
                                        </summary>
                                        <pre class="text-accent-foreground mt-2">{{
                                            JSON.stringify(message.metadata, null, 2)
                                        }}</pre>
                                    </details>
                                </div>
                            </div>
                        </BdInfiniteScroll>
                    </BdScrollArea>
                </div>
            </div>
        </div>

        <div v-else class="py-8 text-center">
            <p class="text-muted-foreground">
                {{ t("console.records.conversationNotFound") }}
            </p>
        </div>

        <template #footer>
            <div class="flex justify-end">
                <UButton color="neutral" variant="soft" @click="emits('close')">
                    {{ t("console.common.close") }}
                </UButton>
            </div>
        </template>
    </BdModal>
</template>
