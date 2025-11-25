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
            <button
                @click="emits('close', false)"
                class="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg px-4 py-2 transition-colors"
            >
                {{ t("console.common.cancel") }}
            </button>
            <button
                @click="emits('close', true)"
                class="rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600"
            >
                {{ t("console.records.confirm_delete.confirm") }}
            </button>
        </div>
    </BdModal>
</template>
