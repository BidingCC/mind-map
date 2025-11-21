<script lang="ts" setup>
import type { AiModel } from "@buildingai/service/webapi/ai-conversation";
import { apiGetAiProviders } from "@buildingai/service/webapi/ai-conversation";

import type { MindMapConfig } from "../../../models/record";
import { apiGetMindMapConfig, apiSaveMindMapConfig } from "../../../services/console/config";

const { t } = useI18n();
const toast = useMessage();

// 表单数据
const formData = reactive<MindMapConfig>({
    id: "",
    // bindKeyConfigId: "",
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
        // if (!formData.bindKeyConfigId.trim()) {
        //     toast.error(t("console.config.keyRequired"));
        //     return;
        // }

        // 验证计费设置（免费模式不需要验证）
        if (formData.billingType !== 2) {
            if (!formData.billingSetting || formData.billingSetting < 1) {
                toast.error(t("console.config.validBilling"));
                return;
            }
        }
        const updateData = {
            // bindKeyConfigId: formData.bindKeyConfigId,
            billingType: formData.billingType,
            billingSetting: formData.billingType === 2 ? 0 : formData.billingSetting, // 免费模式设置为0
            bindModel: selectedModel.value?.name || "",
            bindModelId: selectedModelId.value,
        };

        await apiSaveMindMapConfig(updateData, formData.id);
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

// 跳转到模型平台官网
// const goToModelPlatform = () => {
//     if (selectedModel.value && providersCache.value.length > 0) {
//         // 在已缓存的供应商信息中查找包含当前选中模型的供应商
//         const provider = providersCache.value.find(
//             (p) => p.models && p.models.some((model: any) => model.id === selectedModel.value?.id),
//         );

//         // 如果找到了供应商且有官网链接，则跳转
//         if (provider && provider.websiteUrl) {
//             window.open(provider.websiteUrl, "_blank");
//         } else {
//             toast.warning(t("console.config.noWebsiteUrl"));
//         }
//     } else if (selectedModel.value) {
//         // 如果没有缓存数据但仍选择了模型，显示提示信息
//         toast.warning(t("console.config.noProviderInfo"));
//     }
// };

onMounted(() => {
    getPluginConfig();
});
</script>

<template>
    <div class="pb-8">
        <UForm :state="formData" class="space-y-6" @submit="submitForm">
            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold">{{ t("console.config.title") }}</h3>
                    <div class="group relative">
                        <div class="group flex cursor-help items-center gap-1 whitespace-nowrap">
                            <svg
                                class="text-muted-foreground group-hover:text-foreground ml-1 h-4 w-4 cursor-help transition-colors"
                                viewBox="0 0 1024 1024"
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="currentColor"
                            >
                                <path
                                    d="M463.99957 784.352211c0 26.509985 21.490445 48.00043 48.00043 48.00043s48.00043-21.490445 48.00043-48.00043c0-26.509985-21.490445-48.00043-48.00043-48.00043S463.99957 757.842226 463.99957 784.352211z"
                                    fill="currentColor"
                                ></path>
                                <path
                                    d="M512 960c-247.039484 0-448-200.960516-448-448S264.960516 64 512 64 960 264.960516 960 512 759.039484 960 512 960zM512 128.287273c-211.584464 0-383.712727 172.128262-383.712727 383.712727 0 211.551781 172.128262 383.712727 383.712727 383.712727 211.551781 0 383.712727-172.159226 383.712727-383.712727C895.712727 300.415536 723.551781 128.287273 512 128.287273z"
                                    fill="currentColor"
                                ></path>
                                <path
                                    d="M512 673.695256c-17.664722 0-32.00086-14.336138-32.00086-31.99914l0-54.112297c0-52.352533 39.999785-92.352318 75.32751-127.647359 25.887273-25.919957 52.67249-52.67249 52.67249-74.016718 0-53.343368-43.07206-96.735385-95.99914-96.735385-53.823303 0-95.99914 41.535923-95.99914 94.559333 0 17.664722-14.336138 31.99914-32.00086 31.99914s-32.00086-14.336138-32.00086-31.99914c0-87.423948 71.775299-158.559333 160.00086-158.559333s160.00086 72.095256 160.00086 160.735385c0 47.904099-36.32028 84.191695-71.424378 119.295794-27.839699 27.776052-56.575622 56.511974-56.575622 82.3356l0 54.112297C544.00086 659.328155 529.664722 673.695256 512 673.695256z"
                                    fill="currentColor"
                                ></path>
                            </svg>
                            <div
                                class="text-muted-foreground group-hover:text-foreground text-sm transition-colors"
                            >
                                {{ t("console.config.description") }}
                            </div>
                        </div>
                        <div
                            class="absolute top-full z-100 hidden w-76 rounded-xl bg-(--secondary-foreground) p-2 text-sm text-(--background) opacity-80 shadow-lg group-hover:block"
                        >
                            <div class="wrap-break-word whitespace-pre-wrap">
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
                            </div>
                        </div>
                    </div>
                </div>

                <UFormField
                    :label="t('console.config.selectModel')"
                    :help="t('console.config.selectModelDescription')"
                    name="selectModel"
                    required
                    class="w-xl whitespace-nowrap"
                >
                    <ModelSelect
                        v-model="selectedModelId"
                        :key="modelSelectKey"
                        :button-ui="{
                            variant: 'outline',
                            color: 'neutral',
                            class: 'bg-background w-sm',
                        }"
                        :supported-model-types="['llm']"
                        :default-selected="false"
                        @change="handleModelChange"
                    />
                </UFormField>

                <!-- <UFormField
                    :label="t('console.config.apiKey')"
                    name="apiKey"
                    required
                    class="w-xl whitespace-nowrap"
                >
                    <KeyPoolSelect
                        v-model="formData.bindKeyConfigId"
                        :key="keyPoolSelectKey"
                        :button-ui="{
                            variant: 'outline',
                            color: 'neutral',
                            class: 'bg-background w-xl',
                        }"
                    />
                    <template #hint>
                        <div class="flex items-center whitespace-nowrap">
                            <span>{{ t("console.config.apiSecretDescription1") }}</span>
                            <span v-if="selectedModel" class="mx-1 font-medium">{{
                                selectedModel.name
                            }}</span>
                            <span v-else class="mx-1 font-medium">xxx</span>
                            <span>{{ t("console.config.apiSecretDescription2") }}</span>
                            <NuxtLink
                                href="javascript:void(0)"
                                @click="goToModelPlatform"
                                class="text-blue-500 hover:underline"
                            >
                                {{ t("console.config.apiSecretDescription3") }}
                            </NuxtLink>
                        </div>
                    </template>
                </UFormField> -->

                <UFormField
                    :label="t('console.config.billing')"
                    name="billing"
                    required
                    class="w-sm whitespace-nowrap"
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
                    />
                    <div v-if="formData.billingType === 1" class="mt-2 flex items-center">
                        <UInput
                            v-model="formData.billingSetting"
                            :placeholder="t('console.config.timesPlaceholder')"
                            type="number"
                            :min="1"
                            class="w-125"
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
                    >
                        {{ isLock ? t("console.config.saving") : t("console.config.save") }}
                    </UButton>
                </AccessControl>
            </div>
        </UForm>
    </div>
</template>

<style scoped></style>
