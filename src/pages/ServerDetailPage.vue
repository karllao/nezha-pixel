<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useWebSocketStore } from "@/composables/websocket";
import { useI18n } from "@/composables/i18n";
import { useRealtimeMetrics } from "@/composables/realtime";
import { fetchServerMetrics, fetchMonitor } from "@/api/nezha";
import type {
  MetricPeriod,
  MetricType,
  NezhaMonitor,
  ServerMetricsData,
} from "@/types/nezha";
import {
  computeBillingInfo,
  formatBytes,
  formatNezhaInfo,
  formatSpeed,
  formatTime,
  formatUptime,
  parsePublicNote,
} from "@/utils/format";
import PixelBar from "@/components/PixelBar.vue";
import PixelChart from "@/components/PixelChart.vue";

const props = defineProps<{ id: number }>();
const router = useRouter();
const ws = useWebSocketStore();
const { t } = useI18n();
const { servers, now, connected, lastMessage } = storeToRefs(ws);

const server = computed(() =>
  servers.value.find((s) => s.id === props.id) || null,
);
const info = computed(() =>
  server.value ? formatNezhaInfo(now.value, server.value) : null,
);
// 走 info.public_note 而非 server.public_note —— formatNezhaInfo 内部已用
// handlePublicNote 缓存最后一次非空值，避免 WS 推送间歇为空时套餐 / 过期闪烁消失
const note = computed(() =>
  info.value ? parsePublicNote(info.value.public_note || "") : null,
);
const billing = computed(() =>
  note.value?.billingDataMod
    ? computeBillingInfo(note.value.billingDataMod)
    : null,
);

type HistoryPeriod = "realtime" | MetricPeriod;
const period = ref<HistoryPeriod>("realtime");

const metricsData = ref<Record<MetricType, ServerMetricsData | null>>({
  cpu: null,
  memory: null,
  disk: null,
  net_in_speed: null,
  net_out_speed: null,
} as Record<MetricType, ServerMetricsData | null>);

const tsdbAvailable = ref<boolean>(true);

const { series: realtimeSeries, points: realtimePoints } = useRealtimeMetrics(
  () => props.id,
);

async function loadMetrics() {
  if (period.value === "realtime") return;
  const metrics: MetricType[] = [
    "cpu",
    "memory",
    "disk",
    "net_in_speed",
    "net_out_speed",
  ];
  await Promise.all(
    metrics.map(async (m) => {
      try {
        const res = await fetchServerMetrics(
          props.id,
          m,
          period.value as MetricPeriod,
        );
        metricsData.value[m] = res.data;
      } catch (err) {
        tsdbAvailable.value = false;
      }
    }),
  );
}

const monitors = ref<NezhaMonitor[]>([]);
async function loadMonitors() {
  try {
    const res = await fetchMonitor(props.id, "1d");
    monitors.value = res.data || [];
  } catch (err) {
    monitors.value = [];
  }
}

onMounted(() => {
  loadMonitors();
});

watch(period, (v) => {
  if (v !== "realtime") loadMetrics();
});
watch(
  () => props.id,
  () => {
    monitors.value = [];
    metricsData.value = {
      cpu: null,
      memory: null,
      disk: null,
      net_in_speed: null,
      net_out_speed: null,
    } as Record<MetricType, ServerMetricsData | null>;
    loadMonitors();
    if (period.value !== "realtime") loadMetrics();
  },
);

function pointsOf(metric: MetricType) {
  if (period.value === "realtime") {
    const key = metric as keyof typeof realtimeSeries.value;
    return realtimeSeries.value[key] || [];
  }
  const d = metricsData.value[metric];
  if (!d?.data_points) return [];
  return d.data_points.map((p) => ({ ts: p.ts, value: p.value }));
}

function monitorPoints(m: NezhaMonitor) {
  if (!m.created_at?.length) return [];
  return m.created_at.map((ts, i) => ({
    ts,
    value: m.avg_delay[i] ?? 0,
  }));
}

const periods: { id: HistoryPeriod; label: string }[] = [
  { id: "realtime", label: "" },
  { id: "1d", label: "" },
  { id: "7d", label: "" },
  { id: "30d", label: "" },
];

function periodLabel(p: HistoryPeriod): string {
  if (p === "realtime") return t("period.realtime");
  if (p === "1d") return t("period.1d");
  if (p === "7d") return t("period.7d");
  return t("period.30d");
}

const billingTag = computed(() => {
  const b = billing.value;
  if (!b || !note.value?.billingDataMod) return null;
  if (b.isNeverExpire)
    return { text: `∞ ${t("card.indefinite")}`, cls: "ok" as const };
  if (b.expired)
    return {
      text: `${t("card.expired")} ${Math.abs(b.daysLeft)}${t("card.days")}`,
      cls: "danger" as const,
    };
  const cls = b.daysLeft <= 7 ? "danger" : b.daysLeft <= 30 ? "warn" : "ok";
  return { text: `${b.daysLeft}${t("card.days")}`, cls };
});

const planTags = computed(() => {
  const p = note.value?.planDataMod;
  if (!p) return [] as { label: string; cls: string }[];
  const tags: { label: string; cls: string }[] = [];
  if (p.bandwidth) tags.push({ label: p.bandwidth, cls: "tag-bw" });
  if (p.trafficVol) tags.push({ label: p.trafficVol, cls: "tag-traffic" });
  if (p.IPv4 === "1") tags.push({ label: "IPv4", cls: "tag-v4" });
  if (p.IPv6 === "1") tags.push({ label: "IPv6", cls: "tag-v6" });
  if (p.networkRoute) {
    p.networkRoute
      .split(",")
      .filter(Boolean)
      .forEach((r) => tags.push({ label: r, cls: "tag-route" }));
  }
  if (p.extra) {
    p.extra
      .split(",")
      .filter(Boolean)
      .forEach((e) => tags.push({ label: e, cls: "tag-extra" }));
  }
  return tags;
});

const priceLine = computed(() => {
  const b = note.value?.billingDataMod;
  if (!b?.amount) return "";
  if (b.amount === "0") return t("billing.free");
  if (b.amount === "-1") return t("billing.usage");
  return `${b.amount}/${b.cycle || ""}`;
});
</script>

<template>
  <div class="detail">
    <button class="back chip btn" @click="router.back()">← {{ t("detail.back") }}</button>

    <div v-if="!connected && !lastMessage" class="loading pixel-border">
      <span class="blink">▶ {{ t("detail.loading") }}</span>
    </div>

    <div v-else-if="!server" class="loading pixel-border">
      <span>{{ t("detail.notFound") }} (#{{ id }})</span>
    </div>

    <template v-else-if="info">
      <section class="hero pixel-border">
        <header class="hero-head">
          <span class="dot" :class="info.online ? 'ok' : 'danger'">●</span>
          <h1>{{ server.name }}</h1>
          <span v-if="server.country_code" class="chip">
            {{ server.country_code.toUpperCase() }}
          </span>
          <span class="spacer" />
          <span class="chip" :class="info.online ? 'ok' : 'danger'">
            {{ info.online ? t("status.online") : t("status.offline") }}
          </span>
        </header>

        <div v-if="planTags.length || priceLine || billingTag" class="plan-row">
          <span v-for="(tag, i) in planTags" :key="i" class="ptag" :class="tag.cls">
            {{ tag.label }}
          </span>
          <span v-if="priceLine" class="ptag tag-price">{{ priceLine }}</span>
          <span v-if="billingTag" class="ptag" :class="billingTag.cls">
            ⏳ {{ billingTag.text }}
          </span>
        </div>

        <div class="bars">
          <PixelBar :value="info.cpu" :label="t('detail.cpu')" />
          <PixelBar :value="info.mem" :label="t('detail.memory')" />
          <PixelBar :value="info.disk" :label="t('detail.disk')" />
        </div>

        <div class="info-grid">
          <div class="info-block">
            <h3>{{ t("detail.system") }}</h3>
            <div class="kv">
              <span class="k">{{ t("detail.platform") }}</span>
              <span class="v">
                {{ info.platform || "-" }}
                <small class="muted">{{ info.platform_version }}</small>
              </span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.arch") }}</span>
              <span class="v">{{ info.arch || "-" }}</span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.agent") }}</span>
              <span class="v">v{{ info.version || "-" }}</span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.country") }}</span>
              <span class="v">{{ server.country_code?.toUpperCase() || "-" }}</span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.boot") }}</span>
              <span class="v">{{ formatTime(info.boot_time * 1000) }}</span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.uptime") }}</span>
              <span class="v">{{ formatUptime(info.uptime) }}</span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.lastActive") }}</span>
              <span class="v">{{ info.last_active_time_string || "-" }}</span>
            </div>
          </div>

          <div class="info-block">
            <h3>{{ t("detail.host") }}</h3>
            <div class="kv">
              <span class="k">{{ t("detail.cpu") }}</span>
              <span class="v">
                <template v-if="info.cpu_info?.length">
                  <div v-for="(c, i) in info.cpu_info" :key="i" class="muted">
                    {{ c }}
                  </div>
                </template>
                <span v-else>-</span>
              </span>
            </div>
            <div v-if="info.gpu_info?.length" class="kv">
              <span class="k">{{ t("detail.gpu") }}</span>
              <span class="v">
                <div v-for="(g, i) in info.gpu_info" :key="i" class="muted">
                  {{ g }}
                </div>
              </span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.memory") }}</span>
              <span class="v">
                {{ formatBytes(info.mem_used) }} /
                {{ formatBytes(info.mem_total) }}
              </span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.swap") }}</span>
              <span class="v">
                {{ formatBytes(info.swap_used) }} /
                {{ formatBytes(info.swap_total) }}
                ({{ info.swap.toFixed(1) }}%)
              </span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.disk") }}</span>
              <span class="v">
                {{ formatBytes(info.disk_used) }} /
                {{ formatBytes(info.disk_total) }}
              </span>
            </div>
            <div
              v-if="info.state?.temperatures?.length"
              class="kv"
            >
              <span class="k">{{ t("detail.temperature") }}</span>
              <span class="v">
                <span
                  v-for="(temp, i) in info.state.temperatures"
                  :key="i"
                  class="temp-pill"
                >
                  {{ temp.Name }}: {{ temp.Temperature.toFixed(1) }}°C
                </span>
              </span>
            </div>
          </div>

          <div class="info-block">
            <h3>{{ t("detail.network") }}</h3>
            <div class="kv">
              <span class="k">{{ t("detail.upDown") }}</span>
              <span class="v">
                ↑ {{ formatSpeed(info.up) }} · ↓ {{ formatSpeed(info.down) }}
              </span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.transfer") }}</span>
              <span class="v">
                ↑ {{ formatBytes(info.net_out_transfer) }}<br />
                ↓ {{ formatBytes(info.net_in_transfer) }}
              </span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.tcpUdp") }}</span>
              <span class="v">{{ info.tcp }} / {{ info.udp }}</span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.process") }}</span>
              <span class="v">{{ info.process }}</span>
            </div>
            <div class="kv">
              <span class="k">{{ t("detail.load") }}</span>
              <span class="v">
                {{ info.load_1 }} / {{ info.load_5 }} / {{ info.load_15 }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section class="charts">
        <div class="charts-head row">
          <h2>{{ t("detail.history") }}</h2>
          <span
            v-if="period === 'realtime'"
            class="chip ok blink-soft"
          >● {{ t("detail.realtime") }} · {{ realtimePoints.length }} pts</span>
          <span class="spacer" />
          <div class="row period-tabs">
            <button
              v-for="p in periods"
              :key="p.id"
              class="chip"
              :class="{ active: period === p.id, disabled: p.id !== 'realtime' && !tsdbAvailable }"
              @click="period = p.id"
              :disabled="p.id !== 'realtime' && !tsdbAvailable"
            >
              {{ periodLabel(p.id) }}
            </button>
          </div>
        </div>

        <div
          v-if="period === 'realtime' && realtimePoints.length === 0"
          class="hint pixel-border"
        >
          <span class="blink">▶ {{ t("status.connecting") }}</span>
        </div>

        <div
          v-else-if="period !== 'realtime' && !tsdbAvailable"
          class="hint pixel-border danger"
        >
          TSDB DISABLED — only realtime data available
        </div>

        <div v-else class="grid grid-2">
          <PixelChart
            :points="pointsOf('cpu')"
            :y-label="`CPU %`"
            color="var(--pixel-accent)"
            :y-max="100"
          />
          <PixelChart
            :points="pointsOf('memory')"
            :y-label="`MEM %`"
            color="var(--pixel-accent-2)"
            :y-max="100"
          />
          <PixelChart
            :points="pointsOf('disk')"
            :y-label="`DISK %`"
            color="var(--pixel-ok)"
            :y-max="100"
          />
          <PixelChart
            :points="pointsOf('net_in_speed')"
            :y-label="`NET ↓ B/s`"
            color="var(--pixel-warn)"
          />
          <PixelChart
            :points="pointsOf('net_out_speed')"
            :y-label="`NET ↑ B/s`"
            color="var(--pixel-danger)"
          />
        </div>
      </section>

      <section v-if="monitors.length" class="monitors">
        <h2>{{ t("detail.serviceMonitor") }} · 1D</h2>
        <div class="grid grid-2">
          <PixelChart
            v-for="m in monitors"
            :key="m.monitor_id"
            :points="monitorPoints(m)"
            :y-label="`${m.monitor_name} (ms)`"
            color="var(--pixel-accent)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.back {
  cursor: pointer;
  background: var(--pixel-bg-alt);
  align-self: flex-start;
}
.hero {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}
.hero-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.hero-head h1 {
  font-size: 22px;
}
.dot {
  font-size: 22px;
  text-shadow: 0 0 8px currentColor;
}
.plan-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ptag {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  padding: 3px 6px;
  border: 1px solid var(--pixel-border);
  
}
.tag-bw {
  background: color-mix(in srgb, var(--pixel-accent) 15%, transparent);
  color: var(--pixel-accent);
  border-color: var(--pixel-accent);
}
.tag-traffic {
  background: color-mix(in srgb, var(--pixel-ok) 15%, transparent);
  color: var(--pixel-ok);
  border-color: var(--pixel-ok);
}
.tag-v4 {
  background: color-mix(in srgb, var(--pixel-accent-2) 15%, transparent);
  color: var(--pixel-accent-2);
  border-color: var(--pixel-accent-2);
}
.tag-v6 {
  background: color-mix(in srgb, var(--pixel-danger) 15%, transparent);
  color: var(--pixel-danger);
  border-color: var(--pixel-danger);
}
.tag-route {
  background: var(--pixel-surface);
}
.tag-extra {
  background: var(--pixel-surface);
  color: var(--pixel-text-dim);
}
.tag-price {
  background: var(--pixel-surface);
}
.ptag.ok {
  color: var(--pixel-ok);
  border-color: var(--pixel-ok);
  background: color-mix(in srgb, var(--pixel-ok) 10%, transparent);
}
.ptag.warn {
  color: var(--pixel-warn);
  border-color: var(--pixel-warn);
  background: color-mix(in srgb, var(--pixel-warn) 10%, transparent);
}
.ptag.danger {
  color: var(--pixel-danger);
  border-color: var(--pixel-danger);
  background: color-mix(in srgb, var(--pixel-danger) 10%, transparent);
}
[data-theme="light"] .tag-bw,
[data-theme="light"] .tag-traffic,
[data-theme="light"] .tag-v4,
[data-theme="light"] .tag-v6,
[data-theme="light"] .ptag.ok,
[data-theme="light"] .ptag.warn,
[data-theme="light"] .ptag.danger {
  background: color-mix(in srgb, currentColor 12%, white);
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}
.info-block {
  background: var(--pixel-bg-alt);
  border: 2px solid var(--pixel-border);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.info-block h3 {
  font-size: 14px;
  color: var(--pixel-accent);
  border-bottom: 2px dotted var(--pixel-border);
  padding-bottom: 4px;
  margin-bottom: 4px;
}
.kv {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px;
  font-family: var(--pixel-font-text);
  font-size: 16px;
  align-items: start;
}
.kv .k {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  color: var(--pixel-text-dim);
  
  padding-top: 3px;
}
.kv .v {
  word-break: break-all;
}
.temp-pill {
  display: inline-block;
  font-family: var(--pixel-font-en);
  font-size: 14px;
  padding: 2px 4px;
  margin: 0 2px 2px 0;
  background: var(--pixel-bg);
  border: 1px solid var(--pixel-border);
}

.charts,
.monitors {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.charts-head {
  align-items: center;
  gap: 8px;
}
.period-tabs {
  gap: 4px;
}
.chip {
  cursor: pointer;
}
.chip.active {
  background: var(--pixel-accent);
  color: var(--pixel-on-accent);
  border-color: var(--pixel-accent);
}
.chip.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.chip.ok {
  color: var(--pixel-ok);
  border-color: var(--pixel-ok);
}
.chip.danger {
  color: var(--pixel-danger);
  border-color: var(--pixel-danger);
}
.btn {
  background: var(--pixel-bg-alt);
}
.hint {
  padding: 30px;
  text-align: center;
  font-family: var(--pixel-font-en);
  font-size: 14px;
  color: var(--pixel-text-dim);
}
.hint.danger {
  color: var(--pixel-danger);
}
.loading {
  padding: 40px;
  text-align: center;
  font-family: var(--pixel-font-en);
  font-size: 14px;
}
.blink {
  animation: blink 1s steps(2) infinite;
}
.blink-soft {
  animation: blinkSoft 1.6s ease-in-out infinite;
}
@keyframes blink {
  50% {
    opacity: 0.3;
  }
}
@keyframes blinkSoft {
  50% {
    opacity: 0.55;
  }
}
</style>
