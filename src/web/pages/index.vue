<script setup lang="ts">
/**
 * 前台AI思维导图首页页面
 * @description 快速创建导图以及查看最近更新的导图
 */
import { useColorMode } from "@vueuse/core";
import { useDebounceFn } from "@vueuse/core";

// 导入图片资源
import fishboneImg from "../assets/icons/fishbone.png";
import fishboneDarkImg from "../assets/icons/fishbone-dark.png";
import mindMapImg from "../assets/icons/leftRight.png";
import mindMapDarkImg from "../assets/icons/leftRight-dark.png";
import logicalStructureImg from "../assets/icons/right.png";
import logicalStructureDarkImg from "../assets/icons/right-dark.png";
import organizationStructureImg from "../assets/icons/under.png";
import organizationStructureDarkImg from "../assets/icons/under-dark.png";
import type { MindMapRecord } from "../services/types/record";
import { apiDeleteAiConversation } from "../services/web/ai-conversation";
import {
    apiCreateMindMap,
    apiDeleteMindMap,
    apiGetMindMapConfigUser,
    apiGetMindMapHomeConfigUser,
    apiGetMindMapList,
    apiUpdateMindMapTitle,
} from "../services/web/index";

// 定义思维导图实例接口
interface MindMapInstance {
    destroy(): void;
}

// 导入删除确认弹窗组件
const DeleteConfirmModal = defineAsyncComponent(
    () => import("../components/DeleteConfirmModal.vue"),
);

defineOptions({
    name: "MindMapPage",
});

// 定义页面元信息
definePageMeta({
    name: "首页",
    inLinkSelector: true,
});

const toast = useMessage();
const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const colorMode = useColorMode();
const scrollContainer = shallowRef<HTMLElement | null>(null);
const overlay = useOverlay();

// 编辑标题相关的响应式数据
const editingItemId = shallowRef<string>("");
const editableTitle = shallowRef("");
// 删除确认状态
const showDeleteModal = shallowRef(false);
const deletingItemId = shallowRef<string | null>(null);

// 插件配置
const pluginConfig = ref<{
    billingType: number;
    billingSetting: number | string;
}>({
    billingType: 1, // 默认按字数计费
    billingSetting: 1,
});

const displayBillingSetting = ref<string | number>("-");

// 控制回到顶部按钮显示
const showBackToTop = shallowRef(false);

const mindMapTypes = [
    { text: "index.main.blank", type: "blank" },
    { text: "index.main.right", type: "logicalStructure" },
    { text: "index.main.leftRight", type: "mindMap" },
    { text: "index.main.under", type: "organizationStructure" },
    { text: "index.main.fishbone", type: "fishbone" },
];

// 定义图片映射关系
const typeImages = ref<Record<string, string>>({});

// 初始化图片映射
const initializeTypeImages = () => {
    typeImages.value = {
        logicalStructure:
            colorMode.value === "dark" ? logicalStructureDarkImg : logicalStructureImg,
        mindMap: colorMode.value === "dark" ? mindMapDarkImg : mindMapImg,
        organizationStructure:
            colorMode.value === "dark" ? organizationStructureDarkImg : organizationStructureImg,
        fishbone: colorMode.value === "dark" ? fishboneDarkImg : fishboneImg,
    };
};

// 监听主题变化
watch(
    () => colorMode.value,
    () => {
        initializeTypeImages();

        // 主题变化时，清空现有预览图并重新生成
        Object.keys(previewImages.value).forEach((key) => {
            delete previewImages.value[key];
        });

        // 重新生成所有思维导图的预览图
        mindMapList.value.forEach((item) => {
            previewImageLoading.value[item.id] = true;
            generatePreviewImage(item).finally(() => {
                previewImageLoading.value[item.id] = false;
            });
        });
    },
);

const mindMapList = ref<MindMapRecord[]>([]);
// 用于存储预览图片的映射
const previewImages = ref<Record<string, string>>({});
// 用于存储预览思维导图实例的映射
const previewInstances = ref<Record<string, MindMapInstance | undefined>>({});
// 用于跟踪预览图片加载状态
const previewImageLoading = ref<Record<string, boolean>>({});
// 用于控制并发生成预览图的数量
const previewGenerationQueue = ref<Promise<void>[]>([]);
// 用于跟踪已处理的思维导图ID，避免重复生成预览图
const processedMindMapIds = ref<Set<string>>(new Set());
// 用于跟踪已进入可视区域的思维导图ID
const visibleMindMapIds = ref<Set<string>>(new Set());
// 用于存储所有定时器ID，以便在组件卸载时清理
const timerIds = ref<Set<NodeJS.Timeout | number>>(new Set());

// 分页相关状态
const currentPage = shallowRef(1);
const pageSize = shallowRef(20);
const total = shallowRef(0);
const loading = shallowRef(false);
const noMore = shallowRef(false);
// 首页配置加载状态
const homeConfigLoading = shallowRef(false);
// 插件配置加载状态
const pluginConfigLoading = shallowRef(false);
// 首页配置
const config = ref({
    name: "",
    publicLanguage: "",
    description: "",
    enabledDescription: true,
});
// 加载首页配置
const loadConfig = async () => {
    try {
        homeConfigLoading.value = true;
        const res = await apiGetMindMapHomeConfigUser();
        config.value.name = res.name || "";
        config.value.publicLanguage = res.publicLanguage || "";
        config.value.description = res.description || "";
        config.value.enabledDescription =
            res.enabledDescription !== undefined ? res.enabledDescription : true;
    } catch (error) {
        console.error("加载AI配置失败:", error);
        // 失败时设置合理的默认值
        config.value.name = "-";
        config.value.publicLanguage = "-";
        config.value.description = "-";
        config.value.enabledDescription = true;
    } finally {
        homeConfigLoading.value = false;
    }
};

// 控制并发生成预览图
const enqueuePreviewGeneration = async (item: MindMapRecord) => {
    // 如果已经处理过该思维导图，直接返回
    if (processedMindMapIds.value.has(item.id)) {
        return;
    }

    // 标记为已处理
    processedMindMapIds.value.add(item.id);
    // 创建一个生成预览图的Promise
    const generationPromise = generatePreviewImage(item).finally(() => {
        // 重置加载状态
        previewImageLoading.value[item.id] = false;
        // 从队列中移除已完成的Promise
        const index = previewGenerationQueue.value.indexOf(generationPromise);
        if (index > -1) {
            previewGenerationQueue.value.splice(index, 1);
        }
    });

    // 设置加载状态
    previewImageLoading.value[item.id] = true;
    // 将Promise添加到队列中
    previewGenerationQueue.value.push(generationPromise);
};

// 检查元素是否在可视区域内
const isInViewport = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 150 &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
};

// 检查可视区域内的思维导图并生成预览图
const checkVisibleMindMaps = () => {
    mindMapList.value.forEach((item) => {
        const element = document.querySelector(`[data-mindmap-id="${item.id}"]`);
        if (element && isInViewport(element as HTMLElement)) {
            // 如果元素在可视区域内且尚未处理
            if (!visibleMindMapIds.value.has(item.id)) {
                visibleMindMapIds.value.add(item.id);
                // 只有当没有预览图时才生成预览图
                if (!previewImages.value[item.id]) {
                    previewImageLoading.value[item.id] = true;
                    enqueuePreviewGeneration(item);
                }
            }
        }
    });
};

const fetchMindMapList = async (page: number = 1) => {
    if (loading.value || noMore.value) return;

    try {
        loading.value = true;
        const queryParams = {
            page: page,
            pageSize: pageSize.value,
        };
        const response = await apiGetMindMapList(queryParams);
        total.value = response.total || 0;

        if (page === 1) {
            mindMapList.value = response.items || [];
            // 清空已处理ID集合，重新开始
            processedMindMapIds.value.clear();
            visibleMindMapIds.value.clear();
            // 清空预览图
            previewImages.value = {};
            previewImageLoading.value = {};
        } else {
            mindMapList.value = [...mindMapList.value, ...(response.items || [])];
        }
        // 检查是否还有更多数据
        if (mindMapList.value.length >= total.value) {
            noMore.value = true;
        }

        // 检查可视区域内的思维导图
        const timerId = setTimeout(() => {
            checkVisibleMindMaps();
        }, 100);
        timerIds.value.add(timerId);
    } catch (error) {
        console.error("获取思维导图列表失败:", error);
        toast.error(t("index.toast.fetchListError"));
        // 第一页加载失败时，显示空列表状态
        if (page === 1) {
            mindMapList.value = [];
        }
    } finally {
        loading.value = false;
    }
};

// 滚动加载处理
const handleScroll = useDebounceFn((event: Event) => {
    const target = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    // 控制回到顶部按钮显示
    showBackToTop.value = scrollTop > 300;

    // 当滚动接近底部时加载更多
    if (scrollTop + clientHeight >= scrollHeight - 100 && !loading.value && !noMore.value) {
        currentPage.value++;
        fetchMindMapList(currentPage.value);
    }

    // 检查可视区域内的思维导图
    checkVisibleMindMaps();
}, 100);

// 回到顶部功能
const scrollToTop = () => {
    if (scrollContainer.value) {
        scrollContainer.value.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    } else {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }
};

// 生成预览图片
const generatePreviewImage = async (item: MindMapRecord) => {
    // 设置加载状态
    previewImageLoading.value[item.id] = true;

    try {
        const MindMapModule = await import("simple-mind-map");
        const MindMap = MindMapModule.default || MindMapModule;
        // @ts-expect-error - 动态导入的插件模块类型定义不完整
        const Export = (await import("simple-mind-map/src/plugins/Export")).default;
        MindMap.usePlugin(Export);

        // 如果已经存在实例，先销毁它
        const existingInstance = previewInstances.value[item.id];
        if (existingInstance) {
            existingInstance.destroy();
            delete previewInstances.value[item.id];
        }

        // 创建临时容器
        const container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
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

        const mindMapInstance = new MindMap({
            el: container,
            data: item.mindMapData.root,
            layout: item.mindMapData.layout,
            readonly: true,
            themeConfig,
            textAutoWrapWidth: 500,
            fit: true,
        } as any);

        // 保存实例引用
        previewInstances.value[item.id] = mindMapInstance;

        // 渲染完成检测
        await new Promise<void>((resolve) => {
            let rendered = false;
            let interval: number | null = null;
            let timeout: number | null = null;

            const checkRender = () => {
                // 检查是否有节点渲染
                const nodes = container.querySelectorAll(".smm-node");
                if (nodes.length > 0) {
                    rendered = true;
                    if (interval !== null) {
                        window.clearInterval(interval);
                        interval = null;
                    }
                    if (timeout !== null) {
                        window.clearTimeout(timeout);
                        timeout = null;
                    }
                    resolve();
                }
            };

            // 定时检查
            interval = window.setInterval(checkRender, 50);

            // 超时处理(最多等待2秒)
            timeout = window.setTimeout(() => {
                if (interval !== null) {
                    window.clearInterval(interval);
                    interval = null;
                }
                if (!rendered) {
                    console.warn("思维导图渲染超时:", item.id);
                    resolve(); // 即使超时也继续，避免阻塞
                }
            }, 2000);

            // 立即检查一次
            window.setTimeout(checkRender, 0);
        });

        // 导出为PNG并获取base64数据
        // @ts-expect-error - simple-mind-map库的png导出方法返回值类型未正确定义
        const data = await mindMapInstance.doExport.png();

        // 验证导出的数据是否有效
        if (data && typeof data === "string" && data.startsWith("data:image")) {
            previewImages.value[item.id] = data;
        } else {
            console.warn("生成的预览图数据无效:", item.id, data);
            // 数据无效时使用默认图标
            previewImages.value[item.id] = "";
        }

        // 清理临时容器
        document.body.removeChild(container);
        mindMapInstance.destroy();
        delete previewInstances.value[item.id];
    } catch (error) {
        console.error("生成预览图时出错:", error);
        // 出错时使用默认图标
        previewImages.value[item.id] = "";
    } finally {
        // 重置加载状态
        previewImageLoading.value[item.id] = false;
    }
};

// 获取插件配置
const fetchPluginConfig = async () => {
    try {
        pluginConfigLoading.value = true;
        const config = await apiGetMindMapConfigUser();
        pluginConfig.value = config;
        // 只有获取成功时才更新显示值
        displayBillingSetting.value = config.billingSetting;
    } catch (error) {
        console.error("获取插件配置失败:", error);
        toast.error(t("index.toast.fetchConfigError"));
        pluginConfig.value = {
            billingType: 1,
            billingSetting: 1,
        };
        // 发生错误时显示"-"
        displayBillingSetting.value = "-";
    } finally {
        pluginConfigLoading.value = false;
    }
};

// 检查是否有思维导图
const hasMindMaps = computed(() => {
    return mindMapList.value && mindMapList.value.length > 0;
});

// 计算显示的费用说明文本
const costDescriptionText = computed(() => {
    const billingSetting = displayBillingSetting.value;
    if (pluginConfig.value.billingType === 1) {
        // 按字数计费说明
        return `${t("index.header.per100Chars")}${billingSetting}${t("index.header.score")}; ${t("index.header.points")}${billingSetting}${t("index.header.score")}`;
    } else {
        return `${t("index.header.eachGenerationFree")}`;
    }
});

// 创建新思维导图
const createNewMindMap = async (type = "blank") => {
    try {
        const id = await apiCreateMindMap({
            userId: userStore.userInfo?.id || "",
            description: t("index.main.untitled"),
            type,
            powerUsed: 0,
        });
        router.push(`/${id}`);
    } catch (e) {
        console.log(e);
        toast.error(t("index.toast.createError"));
    }
};

// 打开已有的思维导图
const openMindMap = (id: string) => {
    router.push(`/${id}`);
};

// 格式化更新时间显示
const formatUpdateTime = (date: string | Date) => {
    const now = new Date();
    const updated = new Date(date);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) {
        return t("index.time.justNow");
    } else if (diffMins < 60) {
        return `${diffMins} ${t("index.time.minutesAgo").replace("{0}", diffMins.toString())}`;
    } else if (diffHours < 24) {
        return `${diffHours} ${t("index.time.hoursAgo").replace("{0}", diffHours.toString())}`;
    } else if (diffDays < 30) {
        return `${diffDays} ${t("index.time.daysAgo").replace("{0}", diffDays.toString())}`;
    } else if (diffMonths < 12) {
        return `${diffMonths} ${t("index.time.monthsAgo").replace("{0}", diffMonths.toString())}`;
    } else {
        return `${diffYears} ${t("index.time.yearsAgo").replace("{0}", diffYears.toString())}`;
    }
};

// 删除思维导图
const deleteMindMap = async (item: MindMapRecord) => {
    deletingItemId.value = item.id;
    handleDeleteModalOpen();
};

/**
 * 确认删除
 */
const confirmDelete = async () => {
    if (!deletingItemId.value) return;

    try {
        const item = mindMapList.value.find((item) => item.id === deletingItemId.value);
        const result = await apiDeleteMindMap(deletingItemId.value);
        if (result) {
            if (item?.aiChatRecordId) {
                await apiDeleteAiConversation(item?.aiChatRecordId);
            }
            currentPage.value = 1;
            noMore.value = false;
            await fetchMindMapList(1);
            toast.success(t("index.toast.deleteSuccess"));
        } else {
            toast.error(t("index.toast.deleteError"));
        }
    } catch (error) {
        console.log(error);
        toast.error(t("index.toast.deleteError"));
    } finally {
        showDeleteModal.value = false;
        deletingItemId.value = null;
    }
};

/**
 * 取消删除
 */
const cancelDelete = () => {
    showDeleteModal.value = false;
    deletingItemId.value = null;
};

// 处理删除弹窗打开
const handleDeleteModalOpen = async () => {
    const modal = overlay.create(DeleteConfirmModal);
    const instance = modal.open();

    const shouldDelete = await instance.result;
    if (shouldDelete) {
        confirmDelete();
    } else {
        cancelDelete();
    }
};

// 下载思维导图
const downloadMindMap = async (item: MindMapRecord) => {
    let cleanupTimer: NodeJS.Timeout | null = null;

    try {
        const MindMapModule = await import("simple-mind-map");
        const MindMap = MindMapModule.default || MindMapModule;
        // @ts-expect-error - 动态导入的插件模块类型定义不完整
        const Export = (await import("simple-mind-map/src/plugins/Export")).default;
        MindMap.usePlugin(Export);

        // 创建临时容器
        const container = document.createElement("div");
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

        const mindMapInstance = new MindMap({
            el: container,
            data: item.mindMapData.root,
            layout: item.mindMapData.layout,
            readonly: true,
            themeConfig,
            textAutoWrapWidth: 500,
            fit: true,
        } as any);

        // 等待渲染完成
        await new Promise((resolve) => setTimeout(resolve, 300));
        // 导出为PNG
        mindMapInstance.export("png", true, item.description);

        cleanupTimer = setTimeout(() => {
            mindMapInstance.destroy();
            document.body.removeChild(container);
            cleanupTimer = null;
        }, 1000);

        // 将定时器ID添加到Set中以便后续清理
        if (cleanupTimer) {
            timerIds.value.add(cleanupTimer);
        }
    } catch (error) {
        if (cleanupTimer) {
            clearTimeout(cleanupTimer);
            // 从Set中移除已清理的定时器ID
            timerIds.value.delete(cleanupTimer);
        }

        // 清理资源
        const container = document.querySelector(
            'div[style*="position: fixed"][style*="left: -9999px"]',
        );
        if (container) {
            document.body.removeChild(container);
        }

        console.error("导出图片时出错:", error);
        toast.error(t("index.toast.downloadError"));
    }
};

// 开始编辑标题
const startEditingTitle = (item: MindMapRecord) => {
    editingItemId.value = item.id;
    editableTitle.value = item.description;
};

// 保存标题
const saveTitle = async (item: MindMapRecord) => {
    if (editableTitle.value.trim()) {
        const newTitle = editableTitle.value.trim();
        try {
            const result = await apiUpdateMindMapTitle(item.id, newTitle);
            if (result) {
                const targetItem = mindMapList.value.find((mapItem) => mapItem.id === item.id);
                if (targetItem) {
                    targetItem.description = newTitle;
                }
            } else {
                toast.error(t("index.toast.updateTitleError"));
            }
        } catch (error) {
            console.error("更新标题时出错:", error);
            toast.error(t("index.toast.updateTitleError"));
        }
    }
    cancelEditingTitle();
};

// 取消编辑标题
const cancelEditingTitle = () => {
    editingItemId.value = "";
    editableTitle.value = "";
};

onMounted(async () => {
    // 并行加载配置和列表数据
    await Promise.all([
        loadConfig().catch((error) => {
            console.error("加载首页配置失败:", error);
            toast.error(t("index.toast.fetchConfigError"));
        }),
        fetchPluginConfig().catch((error) => {
            console.error("加载插件配置失败:", error);
            toast.error(t("index.toast.fetchConfigError"));
        }),
        fetchMindMapList().catch((error) => {
            console.error("加载思维导图列表失败:", error);
            toast.error(t("index.toast.fetchListError"));
        }),
    ]);
});

onUnmounted(() => {
    // 清理所有预览实例
    Object.keys(previewInstances.value).forEach((id) => {
        const instance = previewInstances.value[id];
        if (instance) {
            instance.destroy();
        }
    });
    previewInstances.value = {};

    // 清理所有定时器
    timerIds.value.forEach((timerId) => {
        if (timerId !== null) {
            window.clearTimeout(timerId);
        }
    });
    timerIds.value.clear();
});
</script>

<template>
    <div
        class="flex h-full w-full flex-col overflow-y-auto bg-linear-to-br from-blue-100 via-white to-purple-100 dark:from-gray-900 dark:via-[#18181b] dark:to-slate-900"
        @scroll="handleScroll"
        ref="scrollContainer"
    >
        <header class="relative h-50 shrink-0">
            <div class="absolute inset-0 flex items-center justify-between px-2">
                <div
                    v-if="homeConfigLoading"
                    class="flex h-full w-full items-center justify-center"
                >
                    <div class="flex flex-col items-center">
                        <UIcon
                            name="i-lucide-loader-circle"
                            class="h-6 w-6 animate-spin text-(--color-primary)"
                        />
                    </div>
                </div>
                <div v-else class="flex h-full w-full items-center justify-between">
                    <div
                        class="w-1/4 self-start overflow-hidden text-[18px] font-medium whitespace-nowrap text-gray-600 dark:text-gray-300"
                    >
                        {{ config.name }}
                    </div>
                    <div class="flex-1 px-2 text-center">
                        <h1
                            class="truncate text-3xl font-bold"
                            v-dompurify-html="config.publicLanguage"
                        ></h1>
                        <p
                            v-if="config.enabledDescription"
                            class="mt-2 truncate text-sm font-medium text-gray-600 dark:text-gray-300"
                        >
                            {{ config.description }}
                        </p>
                    </div>
                    <div class="mt-2 w-1/4 self-start text-sm text-gray-600 dark:text-gray-300">
                        <div class="group relative float-right p-3 pt-0">
                            <div class="flex items-center">
                                <UIcon name="i-lucide-info" class="mr-1 h-4 w-4" />
                                <span class="truncate">{{
                                    t("index.header.costDescription")
                                }}</span>
                            </div>
                            <div
                                class="absolute top-full right-0 z-100 hidden w-56 rounded-2xl bg-(--secondary-foreground) p-3 text-sm text-(--background) shadow-lg group-hover:block"
                            >
                                <div class="wrap-break-word whitespace-pre-wrap">
                                    <div v-if="pluginConfigLoading" class="flex items-center">
                                        <UIcon
                                            name="i-lucide-loader-circle"
                                            class="mr-2 h-4 w-4 animate-spin"
                                        />
                                        {{ t("index.loading") }}
                                    </div>
                                    <div v-else>{{ costDescriptionText }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <main
            class="bg-background mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 rounded-tl-xl rounded-tr-xl"
        >
            <div class="flex flex-col gap-2">
                <div class="px-6 pt-4 font-bold whitespace-nowrap">
                    {{ t("index.main.createTitle") }}
                </div>
                <div class="grid grid-cols-5 gap-4 px-6 py-4">
                    <div
                        v-for="(item, index) in mindMapTypes"
                        :key="index"
                        class="flex h-60 cursor-pointer flex-col rounded-xl border border-(--border) transition-all duration-200 hover:scale-105 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        @click="createNewMindMap(item.type)"
                    >
                        <div
                            class="bg-ground flex h-60 w-full items-center justify-center overflow-hidden rounded-t-xl border-b p-4 transition-colors"
                        >
                            <img
                                v-if="item.type !== 'blank' && typeImages[item.type]"
                                :src="typeImages[item.type]"
                                :alt="t(item.text)"
                                class="h-full w-full object-contain"
                            />
                            <UIcon
                                v-else
                                name="i-lucide-plus"
                                class="h-8 w-8 text-(--foreground)"
                            />
                        </div>
                        <div class="flex items-center truncate p-2 text-sm">
                            {{ t(item.text) }}
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-1 flex-col">
                <div class="mb-2 px-6 font-bold">{{ t("index.main.recently") }}</div>
                <div class="min-h-0 flex-1">
                    <div v-if="loading && currentPage === 1" class="flex justify-center py-12">
                        <div class="flex flex-col items-center">
                            <UIcon
                                name="i-lucide-loader-circle"
                                class="h-8 w-8 animate-spin text-(--color-primary)"
                            />
                        </div>
                    </div>
                    <div v-else-if="hasMindMaps" class="grid grid-cols-5 gap-4 px-6 py-4">
                        <div
                            v-for="item in mindMapList"
                            :key="item.id"
                            :data-mindmap-id="item.id"
                            @click="openMindMap(item.id)"
                            class="flex h-60 cursor-pointer flex-col rounded-xl border border-(--border) transition-all duration-200 hover:scale-105 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        >
                            <!-- 思维导图预览和选项按钮 -->
                            <div
                                class="bg-background group relative mb-0 flex h-44 w-full shrink-0 items-center justify-center rounded-t-xl pt-2 transition-all"
                            >
                                <!-- 显示预览图或默认图标 -->
                                <img
                                    v-if="
                                        previewImages[item.id] &&
                                        previewImages[item.id]?.startsWith('data:image')
                                    "
                                    :src="previewImages[item.id]"
                                    :alt="t('index.main.previewAlt')"
                                    class="h-full w-full object-contain select-none"
                                    :class="{ 'opacity-50': previewImageLoading[item.id] }"
                                />
                                <UIcon
                                    v-else-if="!previewImageLoading[item.id]"
                                    name="i-lucide-brain"
                                    class="h-8 w-8 text-(--foreground)"
                                />
                                <!-- 加载状态指示器 -->
                                <div
                                    v-if="previewImageLoading[item.id]"
                                    class="bg-background/70 absolute inset-0 flex items-center justify-center rounded-t-xl"
                                >
                                    <UIcon
                                        name="i-lucide-loader-circle"
                                        class="text-primary h-6 w-6 animate-spin"
                                    />
                                </div>

                                <UDropdownMenu
                                    :items="[
                                        [
                                            {
                                                label: t('index.main.download'),
                                                icon: 'i-lucide-download',
                                                onSelect: () => downloadMindMap(item),
                                            },
                                            {
                                                label: t('index.main.rename'),
                                                icon: 'i-lucide-pencil',
                                                onSelect: () => startEditingTitle(item),
                                            },
                                            {
                                                label: t('index.main.delete'),
                                                icon: 'i-lucide-trash-2',
                                                color: 'error',
                                                onSelect: () => deleteMindMap(item),
                                            },
                                        ],
                                    ]"
                                    class="absolute top-0 right-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                                >
                                    <UButton
                                        color="neutral"
                                        variant="link"
                                        icon="i-lucide-ellipsis"
                                        size="xs"
                                        class="flex h-8 w-8 items-center justify-center rounded p-0"
                                        @click.stop
                                    />
                                </UDropdownMenu>
                            </div>

                            <!-- 标题和更新时间 -->
                            <div
                                class="w-full cursor-pointer rounded-b-xl border-t border-(--border) p-2 whitespace-nowrap"
                            >
                                <div class="flex flex-col gap-2">
                                    <!-- 修改标题显示部分，支持内联编辑 -->
                                    <div class="truncate text-sm font-medium">
                                        <span
                                            v-if="editingItemId !== item.id"
                                            @dblclick.stop="startEditingTitle(item)"
                                            class="cursor-pointer"
                                        >
                                            {{ item.description }}
                                        </span>
                                        <input
                                            v-else
                                            v-model="editableTitle"
                                            @blur="saveTitle(item)"
                                            @keyup.enter="saveTitle(item)"
                                            @keyup.esc="cancelEditingTitle"
                                            @click.stop
                                            class="w-full border-b border-(--color-primary) bg-transparent focus:outline-none"
                                            type="text"
                                            ref="titleInput"
                                        />
                                    </div>
                                    <span class="truncate text-xs">{{
                                        formatUpdateTime(item.updatedAt)
                                    }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        v-else-if="!loading && !hasMindMaps"
                        class="flex flex-col items-center justify-center py-12"
                    >
                        <div
                            class="bg-background flex h-32 w-32 items-center justify-center rounded-full"
                        >
                            <UIcon name="i-lucide-file-question" class="h-16 w-16 text-(--ring)" />
                        </div>
                        <div class="flex flex-col items-center gap-2 text-center text-(--ring)">
                            <div class="text-sm">{{ t("index.main.createdTip") }}</div>

                            <UButton
                                color="primary"
                                icon="i-heroicons-plus"
                                class="h-auto rounded-lg px-10 py-2 text-sm font-normal"
                                @click="createNewMindMap()"
                            >
                                {{ t("index.main.create") }}
                            </UButton>
                        </div>
                    </div>

                    <!-- 列表加载更多时的加载状态 -->
                    <div v-if="loading && currentPage > 1" class="flex justify-center py-4">
                        <UIcon
                            name="i-lucide-loader-circle"
                            class="h-6 w-6 animate-spin text-(--color-primary)"
                        />
                    </div>
                </div>
            </div>
        </main>

        <!-- 回到顶部按钮 -->
        <div class="fixed right-10 bottom-10 z-100 md:right-[calc((100vw-1400px)/2)]">
            <UButton
                v-if="showBackToTop"
                color="primary"
                icon="i-lucide-arrow-up-to-line"
                size="lg"
                class="group aspect-square rounded-full shadow-lg transition-all duration-300 hover:shadow-xl"
                @click="scrollToTop"
            >
                <span
                    class="absolute -bottom-5 left-1/2 hidden -translate-x-1/2 transform rounded text-xs whitespace-nowrap text-black opacity-0 transition-opacity duration-300 group-hover:block group-hover:opacity-100 dark:text-white"
                >
                    {{ t("index.main.backToTop") }}
                </span>
            </UButton>
        </div>
    </div>
</template>
<style scoped></style>
