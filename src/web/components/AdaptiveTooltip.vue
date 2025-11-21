<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

/**
 * AdaptiveTooltip 组件：将触发元素与提示内容解耦，
 * 并允许根据指定容器动态计算弹窗位置，适配窄屏布局。
 */
defineOptions({
    name: "AdaptiveTooltip",
});

const props = withDefaults(
    defineProps<{
        teleportTarget?: HTMLElement | null;
        horizontalPadding?: number;
        verticalGap?: number;
        triggerClass?: string | Record<string, boolean> | Array<string>;
        triggerLabel?: string;
    }>(),
    {
        teleportTarget: null,
        horizontalPadding: 8,
        verticalGap: 8,
        triggerClass: () => [
            "group",
            "flex",
            "cursor-help",
            "items-center",
            "gap-1",
            "whitespace-nowrap",
        ],
        triggerLabel: "",
    },
);

const triggerRef = shallowRef<HTMLElement | null>(null);
const tooltipRef = shallowRef<HTMLElement | null>(null);
const tooltipVisible = shallowRef(false);
const tooltipStyle = reactive<{ left: string; top: string }>({ left: "0px", top: "0px" });
const slots = useSlots();
const hasDefaultTriggerSlot = computed(() => Boolean(slots.default));

/**
 * 计算并更新弹窗样式，使其沿着容器边界自动调整。
 */
const updateTooltipPosition = () => {
    const container = props.teleportTarget ?? triggerRef.value?.offsetParent ?? document.body;
    const trigger = triggerRef.value;
    const tooltip = tooltipRef.value;

    if (!container || !trigger || !tooltip) {
        return;
    }

    const containerRect = container.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = triggerRect.left - containerRect.left;
    if (left + tooltipRect.width > containerRect.width - props.horizontalPadding) {
        left = Math.max(
            props.horizontalPadding,
            containerRect.width - tooltipRect.width - props.horizontalPadding,
        );
    } else {
        left = Math.max(props.horizontalPadding, left);
    }

    const top = triggerRect.bottom - containerRect.top + props.verticalGap;

    tooltipStyle.left = `${left}px`;
    tooltipStyle.top = `${top}px`;
};

/**
 * 鼠标移入触发器时展示提示，并在下一帧计算位置。
 */
const handleMouseEnter = () => {
    tooltipVisible.value = true;
    nextTick(updateTooltipPosition);
};

/**
 * 鼠标移出触发器或提示层时隐藏提示。
 */
const handleMouseLeave = () => {
    tooltipVisible.value = false;
};

useEventListener(window, "resize", () => {
    if (tooltipVisible.value) {
        nextTick(updateTooltipPosition);
    }
});

useEventListener(window, "scroll", () => {
    if (tooltipVisible.value) {
        updateTooltipPosition();
    }
});

watch(
    () => props.teleportTarget,
    () => {
        if (tooltipVisible.value) {
            nextTick(updateTooltipPosition);
        }
    },
);

defineExpose({ updateTooltipPosition });
</script>

<template>
    <div
        ref="triggerRef"
        class="inline-flex"
        :class="props.triggerClass"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
        <slot v-if="hasDefaultTriggerSlot" />
        <div v-else class="flex items-center gap-1 whitespace-nowrap">
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
            <span
                v-if="props.triggerLabel"
                class="text-muted-foreground group-hover:text-foreground text-sm transition-colors"
            >
                {{ props.triggerLabel }}
            </span>
        </div>
    </div>

    <Teleport v-if="props.teleportTarget" :to="props.teleportTarget">
        <div
            v-if="tooltipVisible"
            ref="tooltipRef"
            class="absolute z-100 w-76 rounded-xl bg-(--secondary-foreground) p-2 text-sm text-(--background) opacity-95 shadow-lg"
            :style="tooltipStyle"
            @mouseenter="handleMouseEnter"
            @mouseleave="handleMouseLeave"
        >
            <slot name="content" />
        </div>
    </Teleport>

    <div
        v-else-if="tooltipVisible"
        ref="tooltipRef"
        class="absolute z-100 w-76 rounded-xl bg-(--secondary-foreground) p-2 text-sm text-(--background) opacity-80 shadow-lg"
        :style="tooltipStyle"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
        <slot name="content" />
    </div>
</template>
