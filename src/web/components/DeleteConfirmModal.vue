<script setup lang="ts">
withDefaults(
    defineProps<{
        isBatch?: boolean;
        count?: number;
    }>(),
    {
        isBatch: false,
        count: 0,
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
        <p class="text-muted-foreground mb-6">
            {{
                !isBatch
                    ? t("console.records.confirm_delete.single_message")
                    : t("console.records.confirm_delete.batch_message", {
                          count: count,
                      })
            }}
            {{ t("console.records.confirm_delete.warning") }}
        </p>
        <div class="flex justify-end space-x-4">
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
