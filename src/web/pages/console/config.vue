<script lang="ts" setup>
import type { AiModel } from "@buildingai/service/webapi/ai-conversation";
import { apiGetAiProviders } from "@buildingai/service/webapi/ai-conversation";

import AdaptiveTooltip from "../../components/AdaptiveTooltip.vue";
import { apiGetMindMapConfig, apiSaveMindMapConfig } from "../../services/console/config";
import type { MindMapConfig } from "../../services/types/record";

const { t } = useI18n();
const toast = useMessage();

// 表单数据
const formData = reactive<MindMapConfig>({
    id: "",
    bindModel: "",
    bindModelId: "",
    billingType: 1, // 默认按字数计费
    billingSetting: 1,
    createdAt: "",
    updatedAt: "",
});

// 存储选中的模型ID，用于ModelSelect的v-model绑定
const selectedModelId = shallowRef<string>("");
// 选中的模型信息
const selectedModel = ref<AiModel | null>(null);
// 用于强制刷新ModelSelect组件的key
const modelSelectKey = shallowRef<number>(0);
// 存储所有供应商信息
const providersCache = ref<any[]>([]);
// KeyPoolSelect 组件的 key，用于强制更新
const keyPoolSelectKey = shallowRef(0);

/** 获取插件配置详情 */
const { lockFn: getPluginConfig, isLock: detailLoading } = useLockFn(async () => {
    try {
        const response = await apiGetMindMapConfig();
        Object.assign(formData, response);
        // 如果有绑定的模型名称，需要找到对应的模型ID用于显示
        if (response.bindModel) {
            try {
                // 获取所有可用的模型列表
                const providers = await apiGetAiProviders();
                // 缓存供应商信息
                providersCache.value = providers;
                // 获取所有模型（不进行厂商筛选）
                const allModels = providers.flatMap((provider) => provider.models || []);
                // 根据模型名称找到对应的模型对象
                const foundModel = allModels.find((model) => model.name === response.bindModel);

                if (foundModel) {
                    selectedModel.value = foundModel;
                    // 使用nextTick确保在下一个tick中设置selectedModelId，让ModelSelect组件能正确响应
                    await nextTick();
                    selectedModelId.value = foundModel.id;
                    // 强制刷新ModelSelect组件
                    modelSelectKey.value++;
                    keyPoolSelectKey.value++;
                } else {
                    console.warn("未找到匹配的模型:", response.bindModel);
                }
            } catch (error) {
                console.error("获取模型列表失败:", error);
            }
        }

        console.log("处理后的表单数据:", formData);
    } catch (error) {
        console.error("获取配置失败:", error);
        toast.error(t("console.config.loadFailed"));
    }
});

/** 提交表单 */
const { lockFn: submitForm, isLock } = useLockFn(async () => {
    try {
        // 验证必填项
        if (!selectedModel.value?.name?.trim()) {
            toast.error(t("console.config.modelRequired"));
            return;
        }

        // 验证计费设置（免费模式不需要验证）
        if (formData.billingType !== 2) {
            if (!formData.billingSetting || formData.billingSetting < 1) {
                toast.error(t("console.config.validBilling"));
                return;
            }
        }
        const updateData = {
            billingType: formData.billingType,
            billingSetting: formData.billingType === 2 ? 0 : formData.billingSetting, // 免费模式设置为0
            bindModel: selectedModel.value?.name || "",
            bindModelId: selectedModelId.value,
        };

        const result = await apiSaveMindMapConfig(updateData, formData.id);
        if (result === false) {
            toast.error(t("console.config.saveFailed"));
            return;
        }
        toast.success(t("console.config.saveSuccess"));
    } catch (error) {
        console.error("更新配置失败:", error);
        toast.error(t("console.config.saveFailed"));
    }
});

// 处理模型选择变化
const handleModelChange = (model: AiModel | null) => {
    if (!model) {
        selectedModel.value = null;
        selectedModelId.value = "";
        return;
    }

    // 直接设置选中的模型，无需验证厂商
    selectedModel.value = model;
    selectedModelId.value = model.id;
};

onMounted(() => {
    getPluginConfig();
});
</script>

<template>
    <div class="relative pb-8">
        <UForm :state="formData" class="space-y-6" @submit="submitForm">
            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold whitespace-nowrap">
                        {{ t("console.config.title") }}
                    </h3>
                    <AdaptiveTooltip
                        mode="modal"
                        :trigger-label="t('console.config.description')"
                        :modal-title="t('console.config.descriptionContent')"
                    >
                        <template #content>
                            {{ t("console.config.forExample") }}
                            <a
                                href="https://www.kimi.com/"
                                target="_blank"
                                class="text-blue-300 hover:underline"
                            >
                                https://www.kimi.com/
                            </a>
                            <br />
                            {{ t("console.config.ifCannotOpenOfficial") }}
                            (
                            <a
                                href="https://llm.aipg.work/"
                                target="_blank"
                                class="text-blue-300 hover:underline"
                            >
                                https://llm.aipg.work/
                            </a>
                            )
                        </template>
                    </AdaptiveTooltip>
                </div>

                <UFormField
                    :label="t('console.config.selectModel')"
                    :help="t('console.config.selectModelDescription')"
                    name="selectModel"
                    required
                    class="mb-4 max-w-xl min-w-fit whitespace-nowrap"
                >
                    <ModelSelect
                        v-model="selectedModelId"
                        :key="modelSelectKey"
                        :button-ui="{
                            variant: 'outline',
                            color: 'neutral',
                            class: 'bg-background w-full',
                        }"
                        :supported-model-types="['llm']"
                        :default-selected="false"
                        console
                        @change="handleModelChange"
                    />
                </UFormField>

                <UFormField
                    :label="t('console.config.billing')"
                    name="billing"
                    required
                    :disabled="detailLoading || isLock"
                    :loading="isLock"
                    class="mb-2 max-w-xl min-w-fit whitespace-nowrap"
                >
                    <URadioGroup
                        orientation="horizontal"
                        variant="list"
                        :items="[
                            {
                                label: t('console.config.words'),
                                value: 1,
                            },
                            {
                                label: t('console.config.free'),
                                value: 2,
                            },
                        ]"
                        v-model="formData.billingType"
                        :ui="{
                            base: 'cursor-pointer',
                        }"
                    />
                    <div v-if="formData.billingType === 1" class="mt-2 flex items-center">
                        <UInput
                            v-model="formData.billingSetting"
                            :placeholder="t('console.config.timesPlaceholder')"
                            type="number"
                            :min="1"
                            class="w-full min-w-[60px]"
                            style="
                                border-top-right-radius: 0 !important;
                                border-bottom-right-radius: 0 !important;
                            "
                        >
                        </UInput>
                        <span
                            class="text-muted-foreground flex h-8 items-center rounded-r-md border border-l-0 border-(--border) px-3 py-2 text-sm"
                        >
                            {{ t("console.config.wordsDescription") }}
                        </span>
                    </div>
                </UFormField>
            </div>

            <!-- 操作按钮 -->
            <div class="t-4 flex gap-3">
                <AccessControl :codes="['mind-map-plugin:save_plugin_config']">
                    <UButton
                        color="primary"
                        size="lg"
                        type="submit"
                        :loading="isLock"
                        :disabled="detailLoading"
                        :ui="{
                            base: 'cursor-pointer',
                        }"
                    >
                        {{ isLock ? t("console.config.saving") : t("console.config.save") }}
                    </UButton>
                </AccessControl>
            </div>
        </UForm>
    </div>
</template>

<style scoped></style>
