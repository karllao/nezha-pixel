<script setup lang="ts">
import { computed, ref } from "vue";
import dayjs from "dayjs";

const props = withDefaults(
  defineProps<{
    points: { ts: number; value: number }[];
    height?: number;
    color?: string;
    yMax?: number;
    yLabel?: string;
    /** 数值格式化：bytes / percent / ms / raw。默认 raw。 */
    valueFormat?: "raw" | "bytes" | "percent" | "ms";
  }>(),
  {
    height: 120,
    color: "var(--pixel-accent)",
    yLabel: "",
    valueFormat: "raw",
  },
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
        ((p.value - min.value) / range) * (props.height - 4) -
        2;
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

/* ===== Hover 交互 ===== */
const hoverIndex = ref<number | null>(null);
const wrapRef = ref<HTMLDivElement | null>(null);

const timeFormat = computed(() => {
  if (props.points.length < 2) return "HH:mm:ss";
  const span =
    props.points[props.points.length - 1].ts - props.points[0].ts;
  if (span <= 24 * 3600 * 1000) return "HH:mm:ss";
  return "MM-DD HH:mm";
});

function handleMove(e: PointerEvent) {
  if (!props.points.length) return;
  const target = e.currentTarget as Element;
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const idx = Math.round(
    (x / rect.width) * (props.points.length - 1),
  );
  hoverIndex.value = Math.max(0, Math.min(props.points.length - 1, idx));
}

function handleLeave() {
  hoverIndex.value = null;
}

const hoverPoint = computed(() =>
  hoverIndex.value !== null && props.points[hoverIndex.value]
    ? props.points[hoverIndex.value]
    : null,
);

const hoverX = computed(() => {
  if (hoverIndex.value === null) return 0;
  return (
    (hoverIndex.value / Math.max(props.points.length - 1, 1)) * width
  );
});

const hoverY = computed(() => {
  if (!hoverPoint.value) return 0;
  const range = max.value - min.value || 1;
  return (
    props.height -
    ((hoverPoint.value.value - min.value) / range) *
      (props.height - 4) -
    2
  );
});

const hoverPct = computed(() =>
  hoverIndex.value !== null
    ? hoverIndex.value / Math.max(props.points.length - 1, 1)
    : 0,
);

// Tooltip 跟随 hover 线；超过中线时移到左侧避免溢出
const tooltipStyle = computed(() => {
  if (hoverIndex.value === null) return { display: "none" };
  const pct = hoverPct.value * 100;
  if (hoverPct.value < 0.5) {
    return {
      left: `${pct}%`,
      transform: "translate(8px, 0)",
    };
  }
  return {
    left: `${pct}%`,
    transform: "translate(calc(-100% - 8px), 0)",
  };
});

function formatValue(v: number): string {
  if (!Number.isFinite(v)) return "-";
  switch (props.valueFormat) {
    case "percent":
      return `${v.toFixed(1)}%`;
    case "ms":
      return `${v.toFixed(1)} ms`;
    case "bytes": {
      const abs = Math.abs(v);
      if (abs >= 1024 ** 3) return `${(v / 1024 ** 3).toFixed(2)} GB/s`;
      if (abs >= 1024 ** 2) return `${(v / 1024 ** 2).toFixed(2)} MB/s`;
      if (abs >= 1024) return `${(v / 1024).toFixed(2)} KB/s`;
      return `${v.toFixed(0)} B/s`;
    }
    default:
      return v.toFixed(2);
  }
}

const headValue = computed(() =>
  hoverPoint.value ? hoverPoint.value.value : last.value,
);
</script>

<template>
  <div class="chart pixel-border">
    <div class="chart-head">
      <span class="label">{{ yLabel }}</span>
      <span class="value" :style="{ color }">{{ formatValue(headValue) }}</span>
    </div>
    <div class="svg-wrap" ref="wrapRef">
      <svg
        :viewBox="`0 0 ${width} ${height}`"
        preserveAspectRatio="none"
        class="svg"
        :style="{ height: `${height}px` }"
        @pointermove="handleMove"
        @pointerleave="handleLeave"
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
        <!-- Hover 辅助线 + 数据点高亮 -->
        <g v-if="hoverIndex !== null" pointer-events="none">
          <line
            :x1="hoverX"
            :x2="hoverX"
            :y1="0"
            :y2="height"
            stroke="var(--pixel-text-dim)"
            stroke-width="1"
            stroke-dasharray="3 3"
            opacity="0.7"
          />
          <rect
            :x="hoverX - 4"
            :y="hoverY - 4"
            width="8"
            height="8"
            :fill="color"
            stroke="var(--pixel-bg)"
            stroke-width="2"
            shape-rendering="crispEdges"
          />
        </g>
      </svg>

      <div
        v-if="hoverPoint"
        class="tooltip pixel-border"
        :style="tooltipStyle"
      >
        <div class="tt-time">{{ dayjs(hoverPoint.ts).format(timeFormat) }}</div>
        <div class="tt-val" :style="{ color }">
          {{ formatValue(hoverPoint.value) }}
        </div>
      </div>
    </div>
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
  font-size: 14px;
}
.label {
  color: var(--pixel-text-dim);
}
.value {
}
.svg-wrap {
  position: relative;
  width: 100%;
}
.svg {
  width: 100%;
  display: block;
  cursor: crosshair;
}
.tooltip {
  position: absolute;
  top: 4px;
  padding: 6px 8px;
  font-family: var(--pixel-font-text);
  font-size: 13px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 5;
  /* box-shadow 比 pixel-border 默认更紧凑，避免投影占空间 */
  box-shadow: 2px 2px 0 0 var(--pixel-shadow);
  min-width: 90px;
}
.tt-time {
  color: var(--pixel-text-dim);
  font-size: 11px;
  letter-spacing: 0.3px;
}
.tt-val {
  font-family: var(--pixel-font-en);
  font-size: 15px;
}
</style>
