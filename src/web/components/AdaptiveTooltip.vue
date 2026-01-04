<script setup lang="ts">
/**
 * AdaptiveTooltip 组件：点击触发器后通过模态框显示内容。
 */
defineOptions({
    name: "AdaptiveTooltip",
});

const props = withDefaults(
    defineProps<{
        triggerClass?: string | Record<string, boolean> | Array<string>;
        triggerLabel?: string;
        modalTitle?: string;
    }>(),
    {
        triggerClass: () => [
            "group",
            "flex",
            "cursor-pointer",
            "items-center",
            "gap-1",
            "whitespace-nowrap",
        ],
        triggerLabel: "",
        modalTitle: "",
    },
);

const slots = useSlots();
const hasDefaultTriggerSlot = computed(() => Boolean(slots.default));
const modalOpen = shallowRef(false);

/**
 * 点击触发器时打开模态框
 */
const handleClick = () => {
    modalOpen.value = true;
};

/**
 * 关闭模态框
 */
const handleClose = () => {
    modalOpen.value = false;
};
</script>

<template>
    <div class="inline-flex" :class="props.triggerClass" @click="handleClick">
        <slot v-if="hasDefaultTriggerSlot" />
        <div v-else class="flex items-center gap-1 whitespace-nowrap">
            <svg
                class="text-muted-foreground group-hover:text-foreground ml-1 h-4 w-4 cursor-pointer transition-colors"
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
            <span
                v-if="props.triggerLabel"
                class="text-muted-foreground group-hover:text-foreground text-sm transition-colors"
            >
                {{ props.triggerLabel }}
            </span>
        </div>
    </div>

    <BdModal
        v-model:open="modalOpen"
        :title="props.modalTitle"
        :ui="{ content: 'max-w-2xl' }"
        @close="handleClose"
    >
        <div class="wrap-break-word whitespace-pre-wrap">
            <slot name="content" />
        </div>
    </BdModal>
</template>
