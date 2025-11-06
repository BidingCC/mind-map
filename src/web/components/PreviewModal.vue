<script setup lang="ts">
const emits = defineEmits<{
    close: [boolean];
}>();

defineProps<{
    imageUrl?: string;
    imageAlt?: string;
}>();

const { t } = useI18n();

const openImagePreview = (imageUrl: string) => {
    if (!imageUrl) return;
    useImagePreview([imageUrl], 0);
};
</script>

<template>
    <BdModal
        :ui="{ content: 'max-w-[100vw] w-fit' }"
        :title="t('console.records.preview')"
        @close="emits('close', true)"
    >
        <div class="flex items-center justify-center overflow-auto">
            <img
                v-if="imageUrl"
                :src="imageUrl"
                :alt="imageAlt || t('console.records.mindMap')"
                class="max-w-[80vw] cursor-pointer object-contain"
                @click="openImagePreview(imageUrl)"
            />
            <UIcon v-else name="i-lucide-loader" class="h-6 w-6 text-(--ring)" />
        </div>

        <template #footer>
            <div class="flex justify-end">
                <UButton color="neutral" variant="soft" @click="emits('close', true)">
                    {{ t("console.common.close") }}
                </UButton>
            </div>
        </template>
    </BdModal>
</template>
