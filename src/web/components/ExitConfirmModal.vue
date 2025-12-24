<script setup lang="ts">
const emits = defineEmits<{
    close: [boolean];
}>();

const { t } = useI18n();

/**
 * 自动关闭模态框
 * 通过 expose 暴露给外部调用
 */
const autoClose = () => {
    emits("close", false);
};

// 暴露方法给外部调用
defineExpose({
    autoClose,
});
</script>

<template>
    <BdModal
        :title="t('create.exitConfirm.title')"
        :ui="{ content: 'max-w-xl' }"
        @close="emits('close', false)"
    >
        <div class="space-y-4">
            <p class="text-muted-foreground">
                {{ t("create.exitConfirm.message") }}
            </p>
        </div>

        <div class="flex justify-end space-x-4 pt-4">
            <UButton
                @click="emits('close', false)"
                color="secondary"
                class="text-secondary-foreground cursor-pointer rounded-lg px-4 py-2 whitespace-nowrap"
            >
                {{ t("console.common.cancel") }}
            </UButton>
            <UButton
                @click="emits('close', true)"
                color="error"
                class="text-background cursor-pointer rounded-lg px-4 py-2 whitespace-nowrap transition-colors"
            >
                {{ t("create.exitConfirm.confirm") }}
            </UButton>
        </div>
    </BdModal>
</template>
