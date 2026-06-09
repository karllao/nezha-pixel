<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { fetchService } from "@/api/nezha";
import { useI18n } from "@/composables/i18n";
import type { CycleTransferData, ServiceData } from "@/types/nezha";
import { formatBytes } from "@/utils/format";

const { t } = useI18n();
const services = ref<Record<string, ServiceData>>({});
const cycleStats = ref<Record<string, CycleTransferData>>({});
const loading = ref(true);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await fetchService();
    services.value = res.data?.services || {};
    cycleStats.value = res.data?.cycle_transfer_stats || {};
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
  setInterval(load, 30000);
});

const serviceList = computed(() => Object.values(services.value));

function uptimePct(s: ServiceData): number {
  if (!s.up?.length) return 0;
  const totalUp = s.up.reduce((a, b) => a + b, 0);
  const totalDown = s.down.reduce((a, b) => a + b, 0);
  const total = totalUp + totalDown;
  return total > 0 ? (totalUp / total) * 100 : 0;
}

function avgDelay(s: ServiceData): number {
  if (!s.delay?.length) return 0;
  return s.delay.reduce((a, b) => a + b, 0) / s.delay.length;
}

function getStr(v: string | Record<string, string>, key: string): string {
  if (typeof v === "string") return v;
  return v?.[key] ?? "";
}

function getNum(v: number | Record<string, number>, key: string): number {
  if (typeof v === "number") return v;
  return v?.[key] ?? 0;
}
</script>

<template>
  <div class="services-page col">
    <header class="row page-head">
      <h1>{{ t("services.title") }}</h1>
      <span class="spacer" />
      <button class="chip" @click="load">↻ {{ t("services.refresh") }}</button>
    </header>

    <div v-if="loading && !serviceList.length" class="loading pixel-border">
      <span class="blink">▶ {{ t("services.loading") }}</span>
    </div>

    <div v-else-if="error" class="loading pixel-border danger">
      <span>{{ t("common.error") }}: {{ error }}</span>
    </div>

    <template v-else>
      <section v-if="serviceList.length" class="col">
        <h2>{{ t("services.uptime") }}</h2>
        <div class="grid grid-2">
          <div
            v-for="s in serviceList"
            :key="s.service_name"
            class="svc pixel-border"
          >
            <header class="svc-head">
              <span class="name">{{ s.service_name }}</span>
              <span
                class="chip"
                :class="uptimePct(s) >= 99 ? 'ok' : uptimePct(s) >= 95 ? '' : 'danger'"
              >
                {{ uptimePct(s).toFixed(2) }}%
              </span>
            </header>
            <div class="svc-meta">
              <div class="stat">
                <span class="k">{{ t("services.currentUp") }}</span>
                <span class="v">{{ s.current_up }}</span>
              </div>
              <div class="stat">
                <span class="k">{{ t("services.currentDown") }}</span>
                <span class="v">{{ s.current_down }}</span>
              </div>
              <div class="stat">
                <span class="k">{{ t("services.avgDelay") }}</span>
                <span class="v">{{ avgDelay(s).toFixed(1) }} ms</span>
              </div>
            </div>
            <div class="timeline">
              <span
                v-for="(u, i) in s.up.slice(-50)"
                :key="i"
                class="seg"
                :class="u > (s.down[s.down.length - s.up.length + (s.up.length - 50 < 0 ? 0 : s.up.length - 50) + i] || 0) ? 'ok' : 'danger'"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        v-if="Object.keys(cycleStats).length"
        class="col"
        style="margin-top: 16px"
      >
        <h2>{{ t("services.cycleTraffic") }}</h2>
        <div class="grid grid-2">
          <div
            v-for="(cycle, key) in cycleStats"
            :key="key"
            class="cycle pixel-border"
          >
            <header class="cycle-head">
              <span class="name">{{ cycle.name }}</span>
            </header>
            <div
              v-for="(transferVal, sid) in cycle.transfer"
              :key="sid"
              class="cycle-row"
            >
              <div class="cycle-meta">
                <span class="srv-name">{{ cycle.server_name[sid] || sid }}</span>
                <span class="muted">
                  {{ getStr(cycle.from, String(sid)) }} →
                  {{ getStr(cycle.to, String(sid)) }}
                </span>
              </div>
              <div class="cycle-bar">
                <span
                  class="cycle-fill"
                  :style="{
                    width:
                      Math.min(
                        100,
                        (transferVal / (getNum(cycle.max, String(sid)) || 1)) * 100,
                      ) + '%',
                  }"
                />
              </div>
              <div class="cycle-stats">
                <span>{{ formatBytes(transferVal) }}</span>
                <span class="muted">
                  / {{ formatBytes(getNum(cycle.max, String(sid))) }}
                </span>
                <span class="spacer" />
                <span v-if="cycle.next_update?.[sid]" class="muted">
                  {{ t("services.next") }}: {{ cycle.next_update[sid] }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="!serviceList.length && !Object.keys(cycleStats).length" class="empty pixel-border">
        <span>{{ t("services.empty") }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-head h1 {
  font-size: 16px;
}
.loading,
.empty {
  padding: 36px;
  text-align: center;
  font-family: var(--pixel-font-en);
  font-size: 14px;
}
.blink {
  animation: blink 1s steps(2) infinite;
}
@keyframes blink {
  50% {
    opacity: 0.3;
  }
}
.svc {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}
.svc-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.svc-head .name {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  
}
.svc-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.svc-meta .stat {
  display: flex;
  flex-direction: column;
}
.svc-meta .k {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  color: var(--pixel-text-dim);
  
}
.svc-meta .v {
  font-family: var(--pixel-font-text);
  font-size: 16px;
}
.timeline {
  display: flex;
  gap: 2px;
  height: 14px;
}
.timeline .seg {
  flex: 1;
  background: var(--pixel-bg-alt);
}
.timeline .seg.ok {
  background: var(--pixel-ok);
}
.timeline .seg.danger {
  background: var(--pixel-danger);
}

.cycle {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cycle-head {
  display: flex;
  align-items: center;
}
.cycle-head .name {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  
}
.cycle-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-top: 2px solid var(--pixel-border);
}
.cycle-meta {
  display: flex;
  justify-content: space-between;
  font-family: var(--pixel-font-text);
  font-size: 16px;
}
.cycle-meta .srv-name {
  font-family: var(--pixel-font-en);
  font-size: 14px;
}
.cycle-bar {
  height: 10px;
  background: var(--pixel-bg);
  border: 2px solid var(--pixel-border);
  padding: 1px;
}
.cycle-fill {
  display: block;
  height: 100%;
  background: var(--pixel-accent);
}
.cycle-stats {
  display: flex;
  gap: 6px;
  font-family: var(--pixel-font-text);
  font-size: 16px;
}

@media (max-width: 640px) {
  .page-head h1 {
    font-size: 18px;
  }
  .svc {
    padding: 10px;
  }
  .svc-meta {
    gap: 6px;
  }
  .svc-meta .v {
    font-size: 14px;
  }
  .cycle {
    padding: 10px;
  }
  .cycle-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .cycle-stats {
    font-size: 13px;
    flex-wrap: wrap;
  }
}
</style>
