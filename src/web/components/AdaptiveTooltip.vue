<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

/**
 * AdaptiveTooltip 组件：支持两种交互模式
 * - hover: 鼠标悬停显示提示（模式一）
 * - modal: 点击触发器后通过模态框显示内容（模式二）
 */
defineOptions({
    name: "AdaptiveTooltip",
});

const props = withDefaults(
    defineProps<{
        /**
         * 交互模式：hover（悬停显示）或 modal（点击模态框）
         */
        mode?: "hover" | "modal";
        /**
         * 悬停模式：指定容器元素，用于计算弹窗位置
         */
        teleportTarget?: HTMLElement | null;
        /**
         * 悬停模式：水平内边距
         */
        horizontalPadding?: number;
        /**
         * 悬停模式：垂直间距
         */
        verticalGap?: number;
        /**
         * 悬停模式：隐藏延迟时间（毫秒）
         */
        hideDelay?: number;
        /**
         * 触发器样式类
         */
        triggerClass?: string | Record<string, boolean> | Array<string>;
        /**
         * 触发器标签文本
         */
        triggerLabel?: string;
        /**
         * 模态框模式：模态框标题
         */
        modalTitle?: string;
    }>(),
    {
        mode: "hover",
        teleportTarget: null,
        horizontalPadding: 8,
        verticalGap: 8,
        hideDelay: 300,
        triggerClass: () => ["group", "flex", "items-center", "gap-1", "whitespace-nowrap"],
        triggerLabel: "",
        modalTitle: "",
    },
);

const slots = useSlots();
const hasDefaultTriggerSlot = computed(() => Boolean(slots.default));

// 模态框模式相关
const modalOpen = shallowRef(false);

// 悬停模式相关
const triggerRef = shallowRef<HTMLElement | null>(null);
const tooltipRef = shallowRef<HTMLElement | null>(null);
const tooltipVisible = shallowRef(false);
const tooltipStyle = reactive<{ left: string; top: string }>({ left: "0px", top: "0px" });
let hideTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 计算并更新弹窗样式，使其沿着容器边界自动调整（悬停模式）
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
 * 鼠标移入触发器时展示提示，并在下一帧计算位置（悬停模式）
 */
const handleMouseEnter = () => {
    if (props.mode !== "hover") return;

    // 清除隐藏定时器
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
    tooltipVisible.value = true;
    nextTick(updateTooltipPosition);
};

/**
 * 鼠标移出触发器或提示层时延迟隐藏提示（悬停模式）
 */
const handleMouseLeave = () => {
    if (props.mode !== "hover") return;

    // 设置隐藏定时器
    if (hideTimer) {
        clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
        tooltipVisible.value = false;
        hideTimer = null;
    }, props.hideDelay);
};

/**
 * 点击触发器时打开模态框（模态框模式）
 */
const handleClick = () => {
    if (props.mode !== "modal") return;
    modalOpen.value = true;
};

/**
 * 关闭模态框（模态框模式）
 */
const handleClose = () => {
    modalOpen.value = false;
};

// 悬停模式：监听窗口大小变化和滚动
useEventListener(window, "resize", () => {
    if (props.mode === "hover" && tooltipVisible.value) {
        nextTick(updateTooltipPosition);
    }
});

useEventListener(window, "scroll", () => {
    if (props.mode === "hover" && tooltipVisible.value) {
        updateTooltipPosition();
    }
});

// 悬停模式：监听 teleportTarget 变化
watch(
    () => props.teleportTarget,
    () => {
        if (props.mode === "hover" && tooltipVisible.value) {
            nextTick(updateTooltipPosition);
        }
    },
);

// 组件卸载时清除定时器
onUnmounted(() => {
    if (hideTimer) {
        clearTimeout(hideTimer);
    }
});

defineExpose({ updateTooltipPosition });
</script>

<template>
    <!-- 触发器 -->
    <div
        ref="triggerRef"
        class="inline-flex"
        :class="[props.triggerClass, props.mode === 'modal' ? 'cursor-pointer' : 'cursor-help']"
        @click="handleClick"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
        <slot v-if="hasDefaultTriggerSlot" />
        <div v-else class="flex items-center gap-1 whitespace-nowrap">
            <svg
                :class="[
                    'text-muted-foreground group-hover:text-foreground ml-1 h-4 w-4 transition-colors',
                    props.mode === 'modal' ? 'cursor-pointer' : 'cursor-help',
                ]"
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

    <!-- 悬停模式：提示框 -->
    <Teleport v-if="props.mode === 'hover' && props.teleportTarget" :to="props.teleportTarget">
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
        v-else-if="props.mode === 'hover' && tooltipVisible"
        ref="tooltipRef"
        class="absolute z-100 w-76 rounded-xl bg-(--secondary-foreground) p-2 text-sm text-(--background) opacity-95 shadow-lg"
        :style="tooltipStyle"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
        <slot name="content" />
    </div>

    <!-- 模态框模式：模态框 -->
    <BdModal
        v-if="props.mode === 'modal'"
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
