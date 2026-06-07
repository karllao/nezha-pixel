<script setup lang="ts">
import { computed } from "vue";
import { levelColor } from "@/utils/format";

const props = withDefaults(
  defineProps<{
    value: number;
    label?: string;
    showValue?: boolean;
    size?: "sm" | "md";
    segments?: number;
  }>(),
  { showValue: true, size: "md", segments: 20 },
);

const pct = computed(() => Math.max(0, Math.min(100, props.value || 0)));
const level = computed(() => levelColor(pct.value));
const segs = computed(() => {
  const total = props.segments;
  const filled = Math.round((pct.value / 100) * total);
  return Array.from({ length: total }, (_, i) => i < filled);
});
</script>

<template>
  <div class="bar" :class="size">
    <div v-if="label || showValue" class="bar-head">
      <span v-if="label" class="bar-label">{{ label }}</span>
      <span v-if="showValue" class="bar-value" :class="level">
        {{ pct.toFixed(size === "sm" ? 0 : 1) }}%
      </span>
    </div>
    <div class="bar-track">
      <span
        v-for="(seg, i) in segs"
        :key="i"
        class="seg"
        :class="[level, { on: seg }]"
      />
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bar.sm {
  gap: 2px;
}
.bar-head {
  display: flex;
  justify-content: space-between;
  font-family: var(--pixel-font-en);
  font-size: 9px;
  text-transform: uppercase;
}
.bar.sm .bar-head {
  font-size: 8px;
}
.bar-label {
  color: var(--pixel-text-dim);
}
.bar-value {
  letter-spacing: 1px;
}
.bar-track {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--pixel-bg);
  border: 2px solid var(--pixel-border);
}
.bar.sm .bar-track {
  padding: 2px;
  gap: 1px;
}
.seg {
  flex: 1;
  height: 10px;
  background: color-mix(in srgb, var(--pixel-border) 25%, transparent);
}
.bar.sm .seg {
  height: 6px;
}
.seg.on.ok {
  background: var(--pixel-ok);
}
.seg.on.warn {
  background: var(--pixel-warn);
}
.seg.on.danger {
  background: var(--pixel-danger);
}
</style>
