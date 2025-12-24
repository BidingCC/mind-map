<script setup lang="ts">
withDefaults(
    defineProps<{
        isBatch?: boolean;
        count?: number;
        message?: string;
        batchMessage?: string;
        warning?: string;
    }>(),
    {
        isBatch: false,
        count: 0,
        message: "",
        batchMessage: "",
        warning: "",
    },
);

const emits = defineEmits<{
    close: [boolean];
}>();

const { t } = useI18n();
</script>

<template>
    <BdModal
        :title="t('console.records.confirm_delete.title')"
        :ui="{ content: 'max-w-xl' }"
        @close="emits('close', false)"
    >
        <div class="space-y-4">
            <p class="text-muted-foreground">
                {{
                    !isBatch
                        ? message || t("console.records.confirm_delete.single_message")
                        : batchMessage ||
                          t("console.records.confirm_delete.batch_message", {
                              count: count,
                          })
                }}
                {{ warning || t("console.records.confirm_delete.warning") }}
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
                {{ t("console.records.confirm_delete.confirm") }}
            </UButton>
        </div>
    </BdModal>
</template>
