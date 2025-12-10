<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import Draggable from "vuedraggable";

import { apiGetMindMapExamples, apiSaveMindMapExamples } from "../../../services/console/examples";

const { t } = useI18n();
const toast = useMessage();

/**
 * 思维导图AI界面配置页面
 * @description 配置思维导图AI界面相关设置
 */
defineOptions({
    name: "MindMapExamplesConfigPage",
});

// 定义页面元信息
definePageMeta({
    layout: "console",
    name: "AI界面配置",
});

// 响应式数据
const loading = shallowRef(false);
const saveLoading = shallowRef(false);

interface TryItem {
    id: string;
    content: string;
}

const trys = ref<TryItem[]>([]);
// 编辑状态管理
const editingId = shallowRef<string | null>(null);
const editingContent = shallowRef<string>("");

const formData = ref({
    prologue: "",
    dialogText: "",
});

const tryValue = shallowRef(true);
const dialogValue = shallowRef(true);

/**
 * 加载示例配置
 */
const loadExamples = async () => {
    loading.value = true;
    try {
        const config = await apiGetMindMapExamples();
        formData.value.prologue = config.prologue || formData.value.prologue;
        formData.value.dialogText = config.dialogText || formData.value.dialogText;
        trys.value = config.try || trys.value;
        tryValue.value = config.enabledTry !== undefined ? config.enabledTry : tryValue.value;
        dialogValue.value =
            config.enabledDialog !== undefined ? config.enabledDialog : dialogValue.value;
    } catch (error) {
        console.error("加载示例配置失败:", error);
        toast.error(t("console.examples.loadFailed"));
        formData.value.prologue = "";
        formData.value.dialogText = "-";
        trys.value = [];
        tryValue.value = false;
        dialogValue.value = false;
    } finally {
        loading.value = false;
    }
};

/**
 * 保存所有变更
 */
const batchSaveExamples = useDebounceFn(async () => {
    saveLoading.value = true;
    try {
        const saveData = {
            prologue: formData.value.prologue,
            dialogText: dialogValue.value ? formData.value.dialogText : "",
            try: tryValue.value ? trys.value : [],
            enabledTry: tryValue.value,
            enabledDialog: dialogValue.value,
        };

        await apiSaveMindMapExamples(saveData);

        toast.success(t("console.examples.saveSuccess"));
        console.log("保存示例成功");
    } catch (error) {
        console.error("保存示例失败:", error);
        toast.error(t("console.examples.saveFailed"));
    } finally {
        saveLoading.value = false;
    }
}, 300);

// 添加新示例
const addExample = () => {
    const newId = Date.now().toString();
    trys.value.push({ id: newId, content: "" });
    nextTick(() => {
        editingId.value = newId;
        editingContent.value = "";
    });
};

// 删除示例
const removeExample = (index: number) => {
    trys.value.splice(index, 1);
};

// 编辑相关方法
const startEditing = (element: TryItem) => {
    editingId.value = element.id;
    editingContent.value = element.content;
};

const saveEditing = (element: TryItem) => {
    element.content = editingContent.value;
    editingId.value = null;
};

const cancelEditing = () => {
    editingId.value = null;
};

onMounted(async () => {
    await loadExamples();
});
</script>

<template>
    <div class="relative flex h-full flex-col gap-6 md:flex-row">
        <!-- 表单部分 - 可滚动 -->
        <div class="flex-1 overflow-y-auto md:max-h-[calc(100vh-150px)]">
            <UForm :state="formData" class="max-w-2xl space-y-6">
                <div class="flex flex-col gap-4">
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold">{{ t("console.examples.title") }}</h3>
                        <div class="mb-5">
                            <div class="mb-1 text-sm">{{ t("console.examples.prologue") }}</div>
                            <div
                                :class="{
                                    'pointer-events-none opacity-50': loading || saveLoading,
                                }"
                            >
                                <BdEditor v-model="formData.prologue" />
                            </div>
                        </div>

                        <div class="mb-5">
                            <div class="mb-1 flex items-center justify-between">
                                <div class="text-sm">{{ t("console.examples.try") }}</div>
                                <div>
                                    <USwitch
                                        :disabled="loading"
                                        :loading="saveLoading"
                                        v-model="tryValue"
                                    />
                                </div>
                            </div>
                            <template v-if="tryValue">
                                <div class="mb-2 flex justify-end">
                                    <UButton
                                        icon="i-lucide-plus"
                                        color="primary"
                                        variant="ghost"
                                        size="xs"
                                        :disabled="trys.length >= 5 || loading || saveLoading"
                                        @click="addExample"
                                    >
                                        {{ t("console.examples.addExample") }}
                                    </UButton>
                                </div>
                                <Draggable
                                    v-model="trys"
                                    tag="div"
                                    class="mt-2 mb-4 space-y-2 overflow-hidden"
                                    :animation="200"
                                    item-key="id"
                                    :class="{
                                        'pointer-events-none opacity-50': loading || saveLoading,
                                    }"
                                    handle=".drag-handle"
                                >
                                    <template #item="{ element, index }">
                                        <div
                                            class="group rounded-lg border border-(--border) p-3 transition-colors hover:border-(--color-primary)"
                                        >
                                            <div class="flex items-center justify-between">
                                                <div class="flex-1">
                                                    <div
                                                        v-if="editingId === element.id"
                                                        class="flex items-center gap-2"
                                                    >
                                                        <UInput
                                                            v-model="editingContent"
                                                            class="flex-1"
                                                            maxlength="35"
                                                            :disabled="loading || saveLoading"
                                                            :loading="loading"
                                                            trailing
                                                            @keyup.enter="saveEditing(element)"
                                                            @keyup.esc="cancelEditing"
                                                            autofocus
                                                        />
                                                        <UButton
                                                            icon="i-lucide-check"
                                                            color="primary"
                                                            variant="ghost"
                                                            size="xs"
                                                            :disabled="loading || saveLoading"
                                                            @click="saveEditing(element)"
                                                        />
                                                        <UButton
                                                            icon="i-lucide-x"
                                                            color="error"
                                                            variant="ghost"
                                                            size="xs"
                                                            :disabled="loading || saveLoading"
                                                            @click="cancelEditing"
                                                        />
                                                    </div>
                                                    <div
                                                        v-else
                                                        class="flex w-full items-center justify-between"
                                                    >
                                                        <div
                                                            @click="startEditing(element)"
                                                            class="flex-1 cursor-text py-1 text-sm whitespace-nowrap"
                                                        >
                                                            {{ element.content }}
                                                        </div>
                                                        <UButton
                                                            icon="i-lucide-edit"
                                                            color="neutral"
                                                            variant="ghost"
                                                            size="xs"
                                                            :disabled="loading || saveLoading"
                                                            @click="startEditing(element)"
                                                            class="opacity-0 transition-opacity group-hover:opacity-100"
                                                        />
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-1">
                                                    <UButton
                                                        icon="i-lucide-trash-2"
                                                        color="error"
                                                        variant="ghost"
                                                        size="xs"
                                                        :disabled="loading || saveLoading"
                                                        @click="removeExample(index)"
                                                    />
                                                    <UButton
                                                        icon="i-lucide-grip-vertical"
                                                        color="neutral"
                                                        variant="ghost"
                                                        size="xs"
                                                        class="drag-handle cursor-move"
                                                        :disabled="loading || saveLoading"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </Draggable>
                            </template>
                        </div>

                        <div>
                            <div class="mb-1 flex items-center justify-between">
                                <div class="mb-1 text-sm">
                                    {{ t("console.examples.dialogText") }}
                                </div>
                                <div>
                                    <USwitch
                                        :disabled="loading"
                                        :loading="saveLoading"
                                        v-model="dialogValue"
                                    />
                                </div>
                            </div>
                            <template v-if="dialogValue">
                                <UInput
                                    id="ai-prompt"
                                    v-model="formData.dialogText"
                                    :maxlength="20"
                                    :disabled="loading || saveLoading"
                                    :loading="loading"
                                    trailing
                                    :ui="{ base: 'p-3' }"
                                    class="w-full"
                                />
                            </template>
                        </div>
                    </div>
                </div>
            </UForm>
        </div>

        <!-- 预览部分 -->
        <div
            class="flex flex-1 flex-col overflow-hidden rounded-xl border border-(--border) p-2 md:max-h-[calc(100vh-150px)]"
        >
            <h3 class="t-1 pl-2 text-lg font-semibold">
                {{ t("console.examples.previewTest") }}
            </h3>
            <!-- 预览抽屉内容 -->
            <div class="mt-2 flex min-h-0 flex-1 flex-col">
                <!-- 头部预览 -->
                <div class="flex w-full items-center justify-between p-6 pb-0">
                    <h2 class="flex items-center text-lg font-medium">
                        <span
                            class="mr-2 inline-flex rounded-full bg-linear-to-b from-blue-500 to-blue-300 p-2"
                        >
                            <UIcon name="i-lucide-sparkles" class="text-white" />
                        </span>
                        {{ t("console.examples.conversation") }}
                    </h2>
                </div>

                <!-- 内容预览 -->
                <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div class="flex-1 overflow-y-auto p-6 pb-0">
                        <!-- 开场白 -->
                        <div class="mb-4 flex flex-row gap-3">
                            <div class="flex max-w-[80%] flex-col items-start">
                                <div
                                    class="bg-muted prose prose-neutral dark:prose-invert max-w-none rounded-lg px-3 py-2 text-sm"
                                >
                                    <div v-if="loading || saveLoading">
                                        <UIcon name="i-lucide-loader-circle" class="animate-spin" />
                                    </div>
                                    <div v-else v-dompurify-html="formData.prologue"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 底部输入区域预览 -->
                <div class="t-1 sticky bottom-0 shrink-0 bg-(--background) p-4">
                    <template v-if="tryValue">
                        <div class="mb-4 text-sm">
                            {{ t("console.examples.try") }}
                        </div>

                        <div class="mb-4 space-y-2 text-sm whitespace-nowrap">
                            <div
                                v-for="element in trys"
                                :key="element.id"
                                :class="{
                                    'pointer-events-none opacity-50': loading || saveLoading,
                                }"
                                class="w-fit cursor-pointer rounded-lg border border-(--border) p-2 transition-colors hover:border-(--color-primary)"
                            >
                                {{ element.content }}
                            </div>
                        </div>
                    </template>

                    <div class="relative w-full">
                        <UTextarea
                            id="ai-prompt"
                            :rows="1"
                            autoresize
                            :maxrows="4"
                            class="w-full"
                            :placeholder="dialogValue ? formData.dialogText : ''"
                            :ui="{
                                base: 'py-3 pl-3 pr-12 text-[16px]',
                            }"
                            disabled
                        />
                        <UButton
                            color="primary"
                            variant="solid"
                            class="absolute right-2 bottom-3.5 flex h-8 w-8 items-center justify-center rounded-full p-0"
                            disabled
                        >
                            <UIcon name="i-lucide-arrow-up" class="h-4 w-4" />
                        </UButton>
                    </div>
                </div>
            </div>
        </div>

        <!-- 保存按钮 -->
        <div class="absolute bottom-0 left-0">
            <UButton
                size="lg"
                color="primary"
                :loading="saveLoading"
                :disabled="loading"
                @click="batchSaveExamples"
                class="mb-4"
            >
                {{ t("console.examples.save") }}
            </UButton>
        </div>
    </div>
</template>

<style scoped>
/* 添加与ProEditor组件中相同的富文本样式 */
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
</style>
