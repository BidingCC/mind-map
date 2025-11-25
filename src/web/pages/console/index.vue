<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { type Row } from "@tanstack/table-core";
import { useColorMode } from "@vueuse/core";
import { useDebounceFn } from "@vueuse/core";

// 异步加载弹窗组件
const DeleteConfirmModal = defineAsyncComponent(
    () => import("../../components/DeleteConfirmModal.vue"),
);
const PreviewModal = defineAsyncComponent(() => import("../../components/PreviewModal.vue"));
const ConversationDetailModal = defineAsyncComponent(
    () => import("../../components/ConversationDetailModal.vue"),
);
import type { AiMessage } from "@buildingai/service/models/message";

import type { AiChatRecord } from "../../models/ai-record";
import type { MindMapRecord } from "../../models/record";
import {
    apiDeleteAiConversationConsole,
    apiDeleteAiConversationConsoles,
    apiGetAiConversation,
    apiGetAiConversationDetail,
} from "../../services/console/ai-conversation";
import {
    apiBatchDeleteMindMapConsole,
    apiDeleteMindMapConsole,
    apiSearchMindMapRecordsConsole,
} from "../../services/console/record";
const UCheckbox = resolveComponent("UCheckbox");
const UButton = resolveComponent("UButton");
const UIcon = resolveComponent("UIcon");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const { t } = useI18n();
const toast = useMessage();
const overlay = useOverlay();

/**
 * 后台思维导图管理页面
 * @description 管理所有思维导图
 */
defineOptions({
    name: "MindMapManagementPage",
});

// 定义页面元信息
definePageMeta({
    layout: "console",
    name: "生成记录",
});

// 删除确认模态框状态
const showDeleteModal = shallowRef(false);
const deletingRecordId = shallowRef<string | null>(null);
const isBatchDelete = shallowRef(false);

// 列表查询参数
const searchForm = reactive({
    description: undefined,
    userIdentifier: undefined,
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
});
const isOpen = shallowRef(false);
// 添加对话详情相关状态
const isConversationDetailOpen = shallowRef(false);
const currentConversationId = shallowRef<string | undefined>();
const conversationDetail = shallowRef<AiChatRecord | null>(null);
const conversationMessages = ref<AiMessage[]>([]);
const conversationMessagesLoading = shallowRef(false);
const hasMoreMessages = shallowRef(false);
const messagePagination = reactive({
    page: 1,
    pageSize: 10,
});
const selected = ref<MindMapRecord>();

// 存储预览图片的映射
const previewImages = ref<Record<string, string>>({});
// 选中的预览图片
const selectedPreviewImage = shallowRef("");
const colorMode = useColorMode();
// 用于存储预览思维导图实例的映射
const previewInstances = ref<Record<string, any>>({});
// 定义表格列
const columns: TableColumn<MindMapRecord>[] = [
    {
        id: "select",
        header: () =>
            h(UCheckbox, {
                modelValue: selectedRows.value.length === paging.items.length,
                "onUpdate:modelValue": (value: boolean) => {
                    selectedRows.value = value ? paging.items.map((item) => ({ ...item })) : [];
                },
                indeterminate:
                    selectedRows.value.length > 0 &&
                    selectedRows.value.length < paging.items.length,
                ariaLabel: "Select all",
            }),
        cell: ({ row }) =>
            h(UCheckbox, {
                modelValue: selectedRows.value.some(
                    (selectedRow) => selectedRow.id === row.original.id,
                ),
                "onUpdate:modelValue": (value: boolean) => {
                    if (value) {
                        selectedRows.value.push(row.original);
                    } else {
                        selectedRows.value = selectedRows.value.filter(
                            (selectedRow) => selectedRow.id !== row.original.id,
                        );
                    }
                },
                ariaLabel: "Select row",
            }),
    },
    {
        accessorKey: "userId",
        header: () => h("p", { class: "" }, `ID`),
        cell: ({ row }) => {
            const power = row.original.userId || 0;
            return h("span", { class: "text-sm" }, power.toString());
        },
    },
    {
        accessorKey: "userInfo",
        header: () => h("p", { class: "" }, `${t("console.records.userInfo")}`),
        cell: ({ row }) => {
            return h("div", { class: "flex items-center gap-2" }, [
                // 用户头像
                row.original.avatar
                    ? h("img", {
                          src: row.original.avatar,
                          alt: "用户头像",
                          class: "h-8 w-8 rounded-full object-cover flex-shrink-0",
                      })
                    : h(
                          "div",
                          {
                              class: "flex h-8 w-8 items-center justify-center rounded-full bg-muted flex-shrink-0",
                          },
                          [
                              h(UIcon, {
                                  name: "i-heroicons-user",
                                  class: "h-4 w-4 text-muted-foreground",
                              }),
                          ],
                      ),
                // 用户名
                h("span", { class: "text-sm font-medium" }, row.original.username || "-"),
            ]);
        },
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return h(UButton, {
                color: "neutral",
                variant: "ghost",
                label: t("console.records.generationTime"),
                icon: isSorted
                    ? isSorted === "asc"
                        ? "i-lucide-arrow-up-narrow-wide"
                        : "i-lucide-arrow-down-wide-narrow"
                    : "i-lucide-arrow-up-down",
                class: "-mx-2.5",
                onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
            });
        },
        cell: ({ row }) => {
            const createdAtValue = row.original.createdAt;
            if (createdAtValue != null && createdAtValue !== "") {
                return h(
                    "span",
                    { class: "text-sm text-muted-foreground dark:text-gray-400" },
                    formatDate(createdAtValue),
                );
            } else {
                return h(
                    "span",
                    { class: "text-sm text-muted-foreground dark:text-gray-400" },
                    "-",
                );
            }
        },
    },
    {
        accessorKey: "conversationsTimes",
        header: () =>
            h("p", { class: "whitespace-nowrap" }, `${t("console.records.conversationsTime")}`),
        cell: ({ row }) => {
            const power = row.original.conversationTimes || 0;
            return h("span", { class: "text-sm" }, power.toString());
        },
    },
    {
        accessorKey: "drawName",
        header: () => h("p", { class: "whitespace-nowrap" }, `${t("console.records.drawName")}`),
        cell: ({ row }) => {
            const power = row.original.description || 0;
            return h("span", { class: "text-sm" }, power.toString());
        },
    },
    {
        accessorKey: "pointUsed",
        header: () => h("p", { class: "whitespace-nowrap" }, `${t("console.records.pointUsed")}`),
        cell: ({ row }) => {
            const power = row.original.powerUsed || 0;
            return h("span", { class: "text-sm" }, power.toString());
        },
    },
    {
        id: "actions",
        header: () => h("p", { class: "" }, `${t("console.records.actions")}`),
        size: 80,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
            return h(UDropdownMenu, { items: getActionItems(row) }, () => {
                return h(UButton, {
                    icon: "i-lucide-ellipsis-vertical",
                    color: "neutral",
                    variant: "ghost",
                    class: "ml-auto",
                });
            });
        },
    },
];

/**
 * 获取表格数据
 */
const { paging, getLists, resetPage } = usePaging({
    fetchFun: apiSearchMindMapRecordsConsole,
    params: searchForm,
});

// 格式化日期为不带时区的本地日期时间字符串
const formatLocalDateTime = (date: string | undefined, isEndDate = false) => {
    if (!date) return undefined;
    const d = new Date(date);
    if (isNaN(d.getTime())) return undefined;
    // 如果是结束日期，设置时间为当天最后一秒
    if (isEndDate) {
        d.setHours(23, 59, 59, 999);
    }
    return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0") +
        " " +
        String(d.getHours()).padStart(2, "0") +
        ":" +
        String(d.getMinutes()).padStart(2, "0") +
        ":" +
        String(d.getSeconds()).padStart(2, "0")
    );
};

// 搜索处理
const handleSearch = useDebounceFn(() => {
    searchForm.startDate = formatLocalDateTime(searchForm.startDate);
    searchForm.endDate = formatLocalDateTime(searchForm.endDate, true);
    resetPage();
    getLists();
}, 300);

/**
 * 获取操作菜单项
 */
function getActionItems(row: Row<MindMapRecord>) {
    return [
        {
            label: t("console.records.mindMap"),
            icon: "i-heroicons:photo",
            onSelect: () => handleViewMindMap(row.original),
        },
        {
            label: t("console.records.conversationDetail"),
            icon: "i-heroicons:chat-bubble-bottom-center-text",
            onSelect: () => handleViewConversation(row.original),
        },
        {
            label: t("console.common.delete"),
            icon: "i-heroicons-trash",
            color: "error" as const,
            onSelect: () => handleDelete(row.original),
        },
    ];
}

// 查看思维导图
const handleViewMindMap = async (item: MindMapRecord) => {
    // 即使已经有预览图，也重新生成以确保最新
    try {
        // 等待生成预览图
        const imageData = await generatePreviewImage(item);
        if (imageData) {
            selectedPreviewImage.value = imageData;
            // 更新缓存
            previewImages.value[item.id] = imageData;
        } else {
            toast.error(t("console.records.previewFailed"));
            return;
        }
    } catch (error) {
        console.error("生成预览图失败:", error);
        toast.error(t("console.records.previewFailed"));
        return;
    }
    handlePreviewModalOpen();
};

const handlePreviewModalOpen = async () => {
    const modal = overlay.create(PreviewModal);
    const instance = modal.open({
        imageUrl: selectedPreviewImage.value,
        imageAlt: t("console.records.mindMap"),
    });

    const reslut = await instance.result;
    if (reslut) {
        isOpen.value = false;
    }
};

// 查看对话详情
const handleViewConversation = async (mindMap: MindMapRecord) => {
    try {
        if (!mindMap.aiChatRecordId) {
            selected.value = mindMap;
            conversationDetail.value = null;
            handleConversationDetailModalOpen();
            return;
        }

        selected.value = mindMap;
        currentConversationId.value = mindMap.aiChatRecordId;
        // 获取对话详情
        conversationDetail.value = await apiGetAiConversationDetail(
            mindMap.aiChatRecordId,
            mindMap.userId,
        );

        // 初始化消息分页参数
        messagePagination.page = 1;
        conversationMessages.value = [];

        // 获取消息列表
        await loadConversationMessages();

        handleConversationDetailModalOpen();
    } catch (error) {
        toast.error(t("console.records.fetchConversationDetailFailed"));
        console.error("获取对话详情失败:", error);
    }
};

const handleConversationDetailModalOpen = async () => {
    const modal = overlay.create(ConversationDetailModal);
    const instance = modal.open({
        conversationDetail: conversationDetail.value,
        conversationMessages: conversationMessages.value,
        conversationMessagesLoading: conversationMessagesLoading.value,
        mindMap: selected.value,
        hasMoreMessages: hasMoreMessages.value,
        loadMoreMessages: loadMoreMessages,
    });

    const reslut = await instance.result;

    if (reslut) {
        isConversationDetailOpen.value = false;
        currentConversationId.value = "";
        conversationDetail.value = null;
        conversationMessages.value = [];
        messagePagination.page = 1;
        hasMoreMessages.value = false;
    }
};

/**
 * 加载对话消息
 */
const loadConversationMessages = async () => {
    if (!currentConversationId.value) return;

    try {
        conversationMessagesLoading.value = true;
        const result = await apiGetAiConversation(currentConversationId.value, {
            page: messagePagination.page,
            pageSize: messagePagination.pageSize,
        });

        // 将新消息添加到列表中
        if (messagePagination.page === 1) {
            conversationMessages.value = result.items;
        } else {
            conversationMessages.value.push(...result.items);
        }

        hasMoreMessages.value = result.total > conversationMessages.value.length;
    } catch (error) {
        toast.error(t("console.records.fetchMessagesFailed"));
        console.error("获取消息列表失败:", error);
    } finally {
        conversationMessagesLoading.value = false;
    }
};

/**
 * 加载更多消息
 */
const loadMoreMessages = async () => {
    if (!hasMoreMessages.value || conversationMessagesLoading.value) return;

    messagePagination.page += 1;
    await loadConversationMessages();
};

// 删除单个记录
const handleDelete = async (item: MindMapRecord) => {
    deletingRecordId.value = item.id;
    isBatchDelete.value = false;
    handleDeleteModalOpen();
};

/**
 * 确认删除
 */
const confirmDelete = async () => {
    try {
        if (!isBatchDelete.value && deletingRecordId.value) {
            // 删除单个
            const item = paging.items.find(
                (item: MindMapRecord) => item.id === deletingRecordId.value,
            );
            await apiDeleteMindMapConsole(deletingRecordId.value);
            if (item?.aiChatRecordId) {
                await apiDeleteAiConversationConsole(item?.aiChatRecordId);
            }
            toast.success(t("console.records.deleteSuccess"));
        } else if (isBatchDelete.value && selectedRows.value.length > 0) {
            // 批量删除
            const ids = selectedRows.value.map((row) => row.id);
            const aiChatRecordIds: string[] = selectedRows.value
                .map((row) => row.aiChatRecordId)
                .filter((id): id is string => id != null);

            await apiBatchDeleteMindMapConsole(ids);
            if (aiChatRecordIds.length > 0) {
                await apiDeleteAiConversationConsoles(aiChatRecordIds);
            }

            toast.success(t("console.records.batchDeleteSuccess"));
            selectedRows.value = [];
        }
        showDeleteModal.value = false;
        deletingRecordId.value = null;
        isBatchDelete.value = false;
        getLists();
    } catch (error) {
        console.log(error);
        toast.error(t("console.records.deleteFailed"));
    }
};

const handleDeleteModalOpen = async () => {
    const modal = overlay.create(DeleteConfirmModal);
    const instance = modal.open({
        isBatch: isBatchDelete.value,
        count: isBatchDelete.value ? selectedRows.value.length : 0,
    });

    const shouldDelete = await instance.result;
    if (shouldDelete) {
        confirmDelete();
    } else {
        showDeleteModal.value = false;
        deletingRecordId.value = null;
        isBatchDelete.value = false;
    }
};

const handleBatchDelete = async () => {
    if (!selectedRows.value.length) {
        toast.warning(t("console.records.selectToDelete"));
        return;
    }
    isBatchDelete.value = true;
    handleDeleteModalOpen();
};

// 生成预览图片
const generatePreviewImage = async (item: MindMapRecord) => {
    try {
        const MindMapModule = await import("simple-mind-map");
        const MindMap = MindMapModule.default || MindMapModule;
        // @ts-expect-error - 动态导入的插件模块类型定义不完整
        const Export = (await import("simple-mind-map/src/plugins/Export")).default;
        MindMap.usePlugin(Export);

        // 如果已经存在实例，先销毁它
        if (previewInstances.value[item.id]) {
            previewInstances.value[item.id].destroy();
            delete previewInstances.value[item.id];
        }

        // 清理可能存在的旧容器元素
        const existingContainer = document.getElementById(`mindmap-preview-${item.id}`);
        if (existingContainer) {
            document.body.removeChild(existingContainer);
        }

        // 创建临时容器
        const container = document.createElement("div");
        container.id = `mindmap-preview-${item.id}`;
        container.style.width = "9999px";
        container.style.height = "9999px";
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "-9999px";
        document.body.appendChild(container);

        // 根据当前系统主题设置思维导图主题
        const isDarkMode =
            colorMode.value === "dark" ||
            (colorMode.value === "auto" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);

        const themeConfig = isDarkMode
            ? {
                  backgroundColor: "#0D0D0D",
                  lineColor: "#cccccc",
                  lineWidth: 2,
                  lineStyle: "curve",
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
                  lineWidth: 2,
                  lineStyle: "curve",
                  root: {
                      fillColor: "#4E47F6",
                  },
                  second: {
                      borderColor: "#4E47F6",
                  },
              };

        const mindMapInstance = new MindMap({
            el: container,
            data: item.mindMapData.root,
            layout: item.mindMapData.layout,
            readonly: true,
            themeConfig,
            textAutoWrapWidth: 500,
        } as any);

        // 保存实例引用
        previewInstances.value[item.id] = mindMapInstance;

        // 等待渲染完成
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 导出为PNG
        const data = await mindMapInstance.export("png", false, item.description);

        // 更新预览图片缓存
        previewImages.value[item.id] = data;

        // 清理DOM元素
        setTimeout(() => {
            if (container.parentNode) {
                document.body.removeChild(container);
            }
        }, 1000);

        return data;
    } catch (error) {
        console.error("生成预览图时出错:", error);
        toast.error(t("console.records.previewGenerationFailed"));
        return null;
    }
};

// 选中的行
const selectedRows = ref<MindMapRecord[]>([]);

const updatePreviewThemes = () => {
    const isDarkMode =
        colorMode.value === "dark" ||
        (colorMode.value === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    const themeConfig = isDarkMode
        ? {
              backgroundColor: "#0D0D0D",
              lineColor: "#cccccc",
              lineWidth: 2,
              lineStyle: "curve",
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
              lineWidth: 2,
              lineStyle: "curve",
              root: {
                  fillColor: "#4E47F6",
              },
              second: {
                  borderColor: "#4E47F6",
              },
          };

    // 更新所有预览实例的主题
    Object.keys(previewInstances.value).forEach((id) => {
        const instance = previewInstances.value[id];
        if (instance) {
            try {
                instance.setThemeConfig(themeConfig);
                // 重新导出图像
                setTimeout(async () => {
                    const data = await instance.doExport.png();
                    previewImages.value[id] = data;
                }, 100);
            } catch (error) {
                console.error(`更新预览图 ${id} 的主题时出错:`, error);
            }
        }
    });
};

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

// 组件挂载时获取数据并添加事件监听
onMounted(async () => {
    getLists();
    // 监听主题变化并重新生成预览图
    watch(colorMode, () => {
        // 更新所有预览图的主题而不是重新创建实例
        updatePreviewThemes();
    });
});

onUnmounted(() => {
    // 清理所有预览实例和DOM元素
    Object.keys(previewInstances.value).forEach((id) => {
        const instance = previewInstances.value[id];
        if (instance) {
            try {
                instance.destroy();
            } catch (e) {
                console.warn(`销毁实例 ${id} 时出错:`, e);
            }
        }

        // 清理可能存在的DOM容器
        const container = document.getElementById(`mindmap-preview-${id}`);
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    previewInstances.value = {};
    previewImages.value = {};
});
</script>

<template>
    <div class="flex h-full flex-col">
        <!-- 搜索区域 -->
        <div class="flex flex-col gap-4 md:flex-row">
            <UInput
                class="min-w-[250px]"
                v-model="searchForm.userIdentifier"
                :placeholder="t('console.placeholders.id')"
                icon="i-heroicons-user"
                @keyup.enter="handleSearch"
            />
            <UInput
                class="min-w-[250px]"
                v-model="searchForm.description"
                :placeholder="t('console.placeholders.key')"
                icon="i-heroicons-magnifying-glass"
                @keyup.enter="handleSearch"
            />
            <BdDateRangePicker
                v-model:start="searchForm.startDate"
                v-model:end="searchForm.endDate"
                :ui="{ root: 'w-auto sm:w-xs' }"
                @change="handleSearch"
            />
            <div class="flex flex-1 justify-end gap-2">
                <UButton
                    class="whitespace-nowrap"
                    @click="handleBatchDelete"
                    color="error"
                    variant="subtle"
                    icon="i-heroicons-trash"
                >
                    {{ t("console.records.batchDelete") }}
                </UButton>
            </div>
        </div>

        <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-2"></div>
        </div>

        <!-- 表格 -->
        <UTable
            ref="table"
            :loading="paging.loading"
            :data="paging.items"
            :columns="columns"
            :row-key="(row: MindMapRecord) => row.id"
            :select-on-click-row="true"
            class="h-[calc(100vh-14rem)]"
            :ui="{
                base: 'table-fixed border-separate border-spacing-0',
                thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
                tbody: '[&>tr]:last:[&>td]:border-b-0',
                th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
                td: 'border-b border-default',
                tr: '[&:has(>td[colspan])]:hidden',
            }"
        />

        <!-- 分页 -->
        <div class="mt-8 flex justify-end">
            <BdPagination
                v-model:page="paging.page"
                v-model:size="paging.pageSize"
                :total="paging.total"
                @change="getLists"
            />
        </div>
    </div>
</template>

<style scoped></style>
