<script setup lang="ts">
import { Color } from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { Editor, EditorContent } from "@tiptap/vue-3";
import { useDebounceFn } from "@vueuse/core";

import { apiGetMindMapHomeConfig, apiSaveMindMapHomeConfig } from "../../../services/console/home";

const { t } = useI18n();
const toast = useMessage();

/**
 * 思维导图首页配置页面
 * @description 配置思维导图首页相关设置
 */
defineOptions({
    name: "MindMapHomeConfigPage",
});

// 定义页面元信息
definePageMeta({
    layout: "console",
    name: "首页配置",
});

// 响应式数据
const loading = shallowRef(false);
const openTip = shallowRef(false);
const saveLoading = shallowRef(false);
const colors = [
    "#958DF1",
    "#F98181",
    "#FBBC88",
    "#FFF599",
    "#A4EB8F",
    "#90C4FF",
    "#C792E9",
    "#FFB74D",
    "#7986CB",
];

const formData = ref({
    name: "",
    publicLanguage: "",
    description: "",
    enabledDescription: true,
});

// 富文本编辑器相关
const editor = shallowRef<Editor | null>(null);

// 初始化富文本编辑器
onMounted(() => {
    editor.value = new Editor({
        content: formData.value.publicLanguage,
        autofocus: false,
        injectCSS: false,
        extensions: [StarterKit, Color, TextStyle],
        editorProps: {
            // 使用原生浏览器样式，移除排版增强
            attributes: { class: "focus:outline-none" },
        },
        onUpdate: ({ editor }) => {
            formData.value.publicLanguage = editor.getHTML();
        },
    });
});

// 监听publicLanguage变化，更新编辑器内容
watch(
    () => formData.value.publicLanguage,
    (newContent) => {
        if (editor.value && newContent !== editor.value.getHTML()) {
            editor.value.commands.setContent(newContent, false);
        }
    },
);

// 设置选中文本颜色
const setPublicLanguageColor = (color: string) => {
    if (editor.value) {
        // 检查当前是否有选中文本
        const { from, to } = editor.value.state.selection;
        const hasSelection = from !== to;

        // 如果没有选中文本，则全选
        if (!hasSelection) {
            editor.value.commands.selectAll();
        }

        if (color) {
            editor.value.chain().focus().setColor(color).run();
        } else {
            editor.value.chain().focus().unsetColor().run();
        }
    }
};

/**
 * 加载首页配置
 */
const loadHomeConfig = async () => {
    loading.value = true;
    try {
        const config = await apiGetMindMapHomeConfig();
        formData.value.name = config.name || formData.value.name;
        formData.value.publicLanguage = config.publicLanguage || formData.value.publicLanguage;
        formData.value.description = config.description || formData.value.description;
        formData.value.enabledDescription =
            config.enabledDescription !== undefined
                ? config.enabledDescription
                : formData.value.enabledDescription;
    } catch (error) {
        console.error("加载首页配置失败:", error);
        toast.error(t("console.home.loadFailed"));
    } finally {
        loading.value = false;
    }
};

/**
 * 保存所有变更
 */
const saveHomeConfig = useDebounceFn(async () => {
    saveLoading.value = true;
    try {
        const saveData = {
            name: formData.value.name,
            publicLanguage: formData.value.publicLanguage,
            description: formData.value.enabledDescription ? formData.value.description : "",
            enabledDescription: formData.value.enabledDescription,
        };

        await apiSaveMindMapHomeConfig(saveData);

        toast.success(t("console.home.saveSuccess"));
        console.log("保存首页配置成功");
    } catch (error) {
        console.error("保存首页配置失败:", error);
        toast.error(t("console.home.saveFailed"));
    } finally {
        saveLoading.value = false;
    }
}, 500);

onMounted(async () => {
    await loadHomeConfig();
});
</script>

<template>
    <div>
        <UForm :state="formData" class="max-w-2xl space-y-6">
            <div>
                <h3 class="mb-4 text-lg font-semibold">{{ t("console.home.title") }}</h3>
                <div class="flex flex-col gap-6">
                    <UFormField :label="t('console.home.name')" class="flex flex-col gap-2">
                        <UInput
                            v-model="formData.name"
                            maxlength="15"
                            class="w-full"
                            :ui="{ base: 'p-3' }"
                        />
                    </UFormField>

                    <UFormField
                        :label="t('console.home.publicLanguage')"
                        class="flex flex-col gap-2"
                    >
                        <template #label>
                            <div class="flex items-center">
                                <span>{{ t("console.home.publicLanguage") }}</span>
                                <UTooltip
                                    :text="t('console.home.publicLanguageTooltip')"
                                    :content="{ side: 'right' }"
                                    v-model:open="openTip"
                                >
                                    <UButton
                                        icon="i-heroicons-information-circle"
                                        variant="link"
                                        size="xs"
                                        class="text-(--muted-foreground)"
                                        @click="openTip = !openTip"
                                    />
                                </UTooltip>
                            </div>
                        </template>
                        <div class="flex flex-col gap-2">
                            <div class="flex gap-2">
                                <UButton
                                    v-for="color in colors"
                                    :key="color"
                                    :style="{ backgroundColor: color }"
                                    class="h-5 w-5 cursor-pointer rounded"
                                    @click="setPublicLanguageColor(color)"
                                    :title="color"
                                />

                                <div class="relative" :title="t('console.home.customColor')">
                                    <UInput
                                        class="h-5 w-5 cursor-pointer rounded opacity-0"
                                        type="color"
                                        @update:model-value="
                                            (color) =>
                                                setPublicLanguageColor((color as string) || '')
                                        "
                                        :ui="{ base: 'w-full h-full cursor-pointer p-0 rounded' }"
                                    />
                                    <div
                                        class="pointer-events-none absolute inset-0 h-5 w-5 rounded bg-linear-to-r from-red-500 to-purple-500"
                                    ></div>
                                </div>

                                <UButton
                                    class="relative h-5 w-5 cursor-pointer overflow-hidden rounded"
                                    @click="setPublicLanguageColor('')"
                                    :title="t('console.home.clearColor')"
                                >
                                    <div class="absolute inset-0 flex flex-wrap">
                                        <div class="h-1/2 w-1/2 bg-black"></div>
                                        <div class="h-1/2 w-1/2 bg-white"></div>
                                        <div class="h-1/2 w-1/2 bg-white"></div>
                                        <div class="h-1/2 w-1/2 bg-black"></div>
                                    </div>
                                </UButton>
                            </div>

                            <div
                                class="min-h-10 rounded-md border border-(--border-accent) p-3 focus-within:border-(--color-primary) focus-within:ring-1 focus-within:ring-(--color-primary) dark:bg-[#171717]"
                            >
                                <EditorContent :editor="editor || undefined" />
                            </div>
                        </div>
                    </UFormField>

                    <UFormField>
                        <div class="mb-2 flex items-center justify-between">
                            <div>{{ t("console.home.description") }}</div>
                            <div><USwitch v-model="formData.enabledDescription" /></div>
                        </div>
                        <UInput
                            v-if="formData.enabledDescription"
                            v-model="formData.description"
                            class="w-full"
                            maxlength="25"
                            :ui="{ base: 'p-3' }"
                        />
                    </UFormField>
                </div>
            </div>

            <!-- 保存按钮 -->
            <div class="form-row">
                <div>
                    <UButton
                        size="lg"
                        color="primary"
                        :loading="saveLoading"
                        @click="saveHomeConfig"
                    >
                        {{ t("console.home.save") }}
                    </UButton>
                </div>
            </div>
        </UForm>
    </div>
</template>

<style scoped></style>
