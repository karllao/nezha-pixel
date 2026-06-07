<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    points: { ts: number; value: number }[];
    height?: number;
    color?: string;
    yMax?: number;
    yLabel?: string;
  }>(),
  { height: 120, color: "var(--pixel-accent)", yLabel: "" },
);

const width = 600;

const max = computed(() => {
  const m = props.yMax ?? Math.max(...props.points.map((p) => p.value), 0);
  return m > 0 ? m : 1;
});

const min = computed(() => {
  const m = Math.min(...props.points.map((p) => p.value), 0);
  return m;
});

const pathD = computed(() => {
  if (!props.points.length) return "";
  const range = max.value - min.value || 1;
  return props.points
    .map((p, i) => {
      const x = (i / Math.max(props.points.length - 1, 1)) * width;
      const y =
        props.height -
        ((p.value - min.value) / range) * (props.height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
});

const fillD = computed(() => {
  if (!pathD.value) return "";
  return `${pathD.value} L${width},${props.height} L0,${props.height} Z`;
});

const last = computed(() =>
  props.points.length ? props.points[props.points.length - 1].value : 0,
);
</script>

<template>
  <div class="chart pixel-border">
    <div class="chart-head">
      <span class="label">{{ yLabel }}</span>
      <span class="value" :style="{ color }">{{ last.toFixed(2) }}</span>
    </div>
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
      class="svg"
      :style="{ height: `${height}px` }"
    >
      <defs>
        <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 20"
            fill="none"
            stroke="var(--pixel-grid)"
            stroke-width="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <path :d="fillD" :fill="color" opacity="0.2" />
      <path
        :d="pathD"
        fill="none"
        :stroke="color"
        stroke-width="2"
        stroke-linejoin="miter"
        shape-rendering="crispEdges"
      />
    </svg>
  </div>
</template>

<style scoped>
.chart {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.chart-head {
  display: flex;
  justify-content: space-between;
  font-family: var(--pixel-font-en);
  font-size: 10px;
  text-transform: uppercase;
}
.label {
  color: var(--pixel-text-dim);
}
.svg {
  width: 100%;
  display: block;
}
</style>
