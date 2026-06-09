<script setup lang="ts">
import { computed } from "vue";
import type { NezhaServer } from "@/types/nezha";
import { formatBytes, formatNezhaInfo, formatSpeed } from "@/utils/format";
import { useI18n } from "@/composables/i18n";

const props = defineProps<{
  servers: NezhaServer[];
  now: number;
}>();

const { t } = useI18n();

const stats = computed(() => {
  let online = 0;
  let upSpeed = 0;
  let downSpeed = 0;
  let upTotal = 0;
  let downTotal = 0;
  for (const s of props.servers) {
    const info = formatNezhaInfo(props.now, s);
    if (info.online) {
      online++;
      upSpeed += info.up;
      downSpeed += info.down;
      upTotal += info.net_out_transfer;
      downTotal += info.net_in_transfer;
    }
  }
  return {
    total: props.servers.length,
    online,
    offline: props.servers.length - online,
    upSpeed,
    downSpeed,
    upTotal,
    downTotal,
  };
});
</script>

<template>
  <section class="overview pixel-border">
    <div class="cell">
      <span class="label">{{ t("stats.servers") }}</span>
      <span class="value">{{ stats.total }}</span>
      <span class="sub">
        <span class="ok">{{ stats.online }} {{ t("stats.on") }}</span> /
        <span class="danger">{{ stats.offline }} {{ t("stats.off") }}</span>
      </span>
    </div>
    <div class="cell">
      <span class="label">{{ t("stats.netUp") }}</span>
      <span class="value">{{ formatSpeed(stats.upSpeed) }}</span>
      <span class="sub muted">{{ t("stats.total") }} {{ formatBytes(stats.upTotal) }}</span>
    </div>
    <div class="cell">
      <span class="label">{{ t("stats.netDown") }}</span>
      <span class="value">{{ formatSpeed(stats.downSpeed) }}</span>
      <span class="sub muted">{{ t("stats.total") }} {{ formatBytes(stats.downTotal) }}</span>
    </div>
    <div class="cell">
      <span class="label">{{ t("stats.time") }}</span>
      <span class="value">{{ new Date(now).toLocaleTimeString() }}</span>
      <span class="sub muted">{{ t("stats.live") }}</span>
    </div>
  </section>
</template>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  padding: 0;
}
.cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-right: 2px solid var(--pixel-border);
}
.cell:last-child {
  border-right: none;
}
.label {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  color: var(--pixel-text-dim);
  
  
}
.value {
  font-family: var(--pixel-font-en);
  font-size: 22px;
  color: var(--pixel-accent);
}
.sub {
  font-family: var(--pixel-font-text);
  font-size: 16px;
}

@media (max-width: 768px) {
  .overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cell {
    border-right: none;
    border-bottom: 2px solid var(--pixel-border);
  }
  .cell:nth-child(odd) {
    border-right: 2px solid var(--pixel-border);
  }
  .cell:nth-last-child(-n + 2) {
    border-bottom: none;
  }
}
@media (max-width: 640px) {
  .cell {
    padding: 10px 12px;
  }
  .label {
    font-size: 12px;
  }
  .value {
    font-size: 18px;
  }
  .sub {
    font-size: 13px;
  }
}
</style>
