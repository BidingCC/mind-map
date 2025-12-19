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
            <button
                @click="emits('close', false)"
                class="bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer rounded-lg px-4 py-2 transition-colors"
            >
                {{ t("console.common.cancel") }}
            </button>
            <button
                @click="emits('close', true)"
                class="cursor-pointer rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600"
            >
                {{ t("create.exitConfirm.confirm") }}
            </button>
        </div>
    </BdModal>
</template>
