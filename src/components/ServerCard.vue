<script setup lang="ts">
import { computed } from "vue";
import type { NezhaServer } from "@/types/nezha";
import {
  computeBillingInfo,
  formatBytes,
  formatNezhaInfo,
  formatSpeed,
  formatUptime,
  parsePublicNote,
} from "@/utils/format";
import { useI18n } from "@/composables/i18n";
import PixelBar from "@/components/PixelBar.vue";

const props = withDefaults(
  defineProps<{
    server: NezhaServer;
    now: number;
    compact?: boolean;
  }>(),
  { compact: false },
);

const { t } = useI18n();

const info = computed(() => formatNezhaInfo(props.now, props.server));
// 走 info.public_note —— 已经过 handlePublicNote 缓存，避免 WS 推送间歇为空时闪烁
const note = computed(() => parsePublicNote(info.value.public_note || ""));
const rawNote = computed(() => {
  const raw = (info.value.public_note || "").trim();
  if (!raw || note.value) return "";
  if (raw.startsWith("{")) return ""; // failed to parse — don't dump raw JSON
  return raw.length > 60 ? `${raw.slice(0, 60)}…` : raw;
});
const billing = computed(() =>
  note.value?.billingDataMod
    ? computeBillingInfo(note.value.billingDataMod)
    : null,
);

// Dev-only: log once if the server has a JSON-like note we can't parse
if (import.meta.env.DEV) {
  const raw = info.value.public_note;
  if (raw && raw.length > 0 && !note.value && raw.includes("{")) {
    console.debug(
      `[nezha-pixel] server #${props.server.id} (${props.server.name}) public_note failed to parse:`,
      raw,
    );
  }
}

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

const billingTag = computed(() => {
  const b = billing.value;
  if (!b || !note.value?.billingDataMod) return null;
  if (b.isNeverExpire) {
    return { text: `∞ ${t("card.indefinite")}`, cls: "ok" as const };
  }
  if (b.expired) {
    return {
      text: `${t("card.expired")} ${Math.abs(b.daysLeft)}${t("card.days")}`,
      cls: "danger" as const,
    };
  }
  const cls = b.daysLeft <= 7 ? "danger" : b.daysLeft <= 30 ? "warn" : "ok";
  return {
    text: `${b.daysLeft}${t("card.days")}`,
    cls,
  };
});

const priceTag = computed(() => {
  const b = note.value?.billingDataMod;
  if (!b?.amount) return null;
  if (b.amount === "0") return t("billing.free");
  if (b.amount === "-1") return t("billing.usage");
  return `${b.amount}/${b.cycle || ""}`;
});
</script>

<template>
  <router-link
    :to="`/server/${server.id}`"
    class="card pixel-border"
    :class="{ offline: !info.online, compact }"
  >
    <!-- Compact mode: 1-2 lines per card, dense -->
    <template v-if="compact">
      <div class="c-row">
        <span class="dot" :class="info.online ? 'ok' : 'danger'">●</span>
        <span class="c-name" :title="server.name">{{ server.name }}</span>
        <span v-if="server.country_code" class="c-flag">
          {{ server.country_code.toUpperCase() }}
        </span>
        <span class="spacer" />
        <span v-if="billingTag" class="c-due" :class="billingTag.cls">
          {{ billingTag.text }}
        </span>
      </div>

      <template v-if="info.online">
        <div class="c-row metrics">
          <div class="m">
            <span class="k">C</span>
            <PixelBar :value="info.cpu" size="sm" :segments="10" :show-value="false" />
            <span class="v" :title="`CPU ${info.cpu.toFixed(1)}%`">
              {{ info.cpu.toFixed(0) }}
            </span>
          </div>
          <span class="divider" aria-hidden="true" />
          <div class="m">
            <span class="k">M</span>
            <PixelBar :value="info.mem" size="sm" :segments="10" :show-value="false" />
            <span class="v" :title="`MEM ${info.mem.toFixed(1)}%`">
              {{ info.mem.toFixed(0) }}
            </span>
          </div>
          <span class="divider" aria-hidden="true" />
          <div class="m">
            <span class="k">D</span>
            <PixelBar :value="info.disk" size="sm" :segments="10" :show-value="false" />
            <span class="v" :title="`DISK ${info.disk.toFixed(1)}%`">
              {{ info.disk.toFixed(0) }}
            </span>
          </div>
          <span class="spacer" />
          <span class="speed">↑{{ formatSpeed(info.up) }}</span>
          <span class="speed">↓{{ formatSpeed(info.down) }}</span>
        </div>
      </template>
      <div v-else class="c-row offline-line">
        <span class="danger">{{ t("card.offline") }}</span>
        <span v-if="info.last_active_time_string" class="muted">
          · {{ t("card.lastSeen") }} {{ info.last_active_time_string }}
        </span>
      </div>

      <div v-if="planTags.length || priceTag" class="c-row plan-row">
        <span v-for="(tag, i) in planTags" :key="i" class="ptag" :class="tag.cls">
          {{ tag.label }}
        </span>
        <span v-if="priceTag" class="ptag tag-price">{{ priceTag }}</span>
      </div>
      <div v-else-if="rawNote" class="c-row note-row muted">{{ rawNote }}</div>
    </template>

    <!-- Detail mode -->
    <template v-else>
      <header class="card-head">
        <span class="dot" :class="info.online ? 'ok' : 'danger'">●</span>
        <span class="name" :title="server.name">{{ server.name }}</span>
        <span class="spacer" />
        <span v-if="server.country_code" class="chip">{{
          server.country_code.toUpperCase()
        }}</span>
        <span v-if="billingTag" class="chip" :class="billingTag.cls">
          {{ billingTag.text }}
        </span>
      </header>

      <div v-if="planTags.length || priceTag" class="plan-tags">
        <span v-for="(tag, i) in planTags" :key="i" class="ptag" :class="tag.cls">
          {{ tag.label }}
        </span>
        <span v-if="priceTag" class="ptag tag-price">{{ priceTag }}</span>
      </div>
      <div v-else-if="rawNote" class="raw-note muted">📝 {{ rawNote }}</div>

      <div v-if="!info.online" class="offline-msg">
        <span>{{ t("card.offline") }}</span>
        <small v-if="info.last_active_time_string" class="muted">
          {{ t("card.lastSeen") }} {{ info.last_active_time_string }}
        </small>
      </div>

      <template v-else>
        <div v-if="info.platform" class="meta">
          <span class="chip">
            {{ info.platform }}{{ info.platform_version ? " " + info.platform_version : "" }}
          </span>
        </div>

        <div class="bars">
          <PixelBar :value="info.cpu" :label="t('card.cpu')" />
          <PixelBar :value="info.mem" :label="t('card.mem')" />
          <PixelBar :value="info.disk" :label="t('card.disk')" />
        </div>

        <div class="stats">
          <div class="stat">
            <span class="k">{{ t("card.up") }}</span>
            <span class="v">{{ formatSpeed(info.up) }}</span>
          </div>
          <div class="stat">
            <span class="k">{{ t("card.down") }}</span>
            <span class="v">{{ formatSpeed(info.down) }}</span>
          </div>
          <div class="stat">
            <span class="k">{{ t("card.outTotal") }}</span>
            <span class="v">{{ formatBytes(info.net_out_transfer) }}</span>
          </div>
          <div class="stat">
            <span class="k">{{ t("card.inTotal") }}</span>
            <span class="v">{{ formatBytes(info.net_in_transfer) }}</span>
          </div>
          <div class="stat">
            <span class="k">{{ t("card.load") }}</span>
            <span class="v">
              {{ info.load_1 }} / {{ info.load_5 }} / {{ info.load_15 }}
            </span>
          </div>
          <div class="stat">
            <span class="k">{{ t("card.uptime") }}</span>
            <span class="v">{{ formatUptime(info.uptime) }}</span>
          </div>
        </div>
      </template>
    </template>
  </router-link>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  color: var(--pixel-text);
  transition: transform 0.06s ease-out;
}
.card:hover {
  transform: translate(-3px, -3px);
  border-color: var(--pixel-accent);
  box-shadow:
    0 0 0 2px var(--pixel-bg) inset,
    7px 7px 0 0 var(--pixel-shadow);
}
.card:hover .name,
.card:hover .c-name {
  color: var(--pixel-accent);
}
.card.offline {
  opacity: 0.7;
}

/* Compact mode */
.card.compact {
  padding: 8px 10px;
  gap: 4px;
}
.c-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--pixel-font-text);
  font-size: 15px;
}
.c-row.metrics {
  gap: 10px;
}
.c-name {
  font-family: var(--pixel-font-en);
  font-size: 17px;
  color: var(--pixel-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}
.c-flag {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  padding: 2px 4px;
  background: var(--pixel-bg);
  border: 1px solid var(--pixel-border);
  color: var(--pixel-text-dim);
}
.c-due {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  
  padding: 2px 5px;
}
.c-due.ok {
  color: var(--pixel-ok);
}
.c-due.warn {
  color: var(--pixel-warn);
}
.c-due.danger {
  color: var(--pixel-danger);
}
.m {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}
.divider {
  flex: 0 0 2px;
  align-self: stretch;
  background: var(--pixel-border);
  margin: 3px 0;
}
.m .k {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  color: var(--pixel-text-dim);
  width: 12px;
  text-align: center;
  letter-spacing: 0;
}
.m .v {
  font-family: var(--pixel-font-en);
  font-size: 16px;
  color: var(--pixel-text);
  width: 30px;
  text-align: right;
}
.m :deep(.bar) {
  flex: 1;
  min-width: 30px;
}
.speed {
  font-family: var(--pixel-font-text);
  font-size: 15px;
  color: var(--pixel-text);
  white-space: nowrap;
}
.offline-line {
  font-family: var(--pixel-font-en);
  font-size: 14px;
}
.plan-row {
  flex-wrap: wrap;
  gap: 3px !important;
}
.plan-row .ptag {
  font-size: 14px;
  padding: 2px 5px;
}
.note-row {
  font-size: 14px;
  font-family: var(--pixel-font-text);
}
.raw-note {
  font-family: var(--pixel-font-text);
  font-size: 14px;
  padding: 4px 6px;
  background: var(--pixel-bg-alt);
  border: 1px dashed var(--pixel-border);
}

/* Detail mode */
.card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--pixel-font-en);
  font-size: 14px;
  flex-wrap: wrap;
}
.dot {
  font-size: 16px;
  line-height: 1;
  text-shadow: 0 0 8px currentColor, 0 0 4px currentColor;
}
.dot.ok {
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.55;
  }
}
.name {
  font-family: var(--pixel-font-en);
  font-size: 20px;
  color: var(--pixel-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}
.plan-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ptag {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  padding: 2px 5px;
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
/* 浅模式下叠白避免淡掉 */
[data-theme="light"] .tag-bw,
[data-theme="light"] .tag-traffic,
[data-theme="light"] .tag-v4,
[data-theme="light"] .tag-v6 {
  background: color-mix(in srgb, currentColor 14%, white);
}
.tag-route {
  background: var(--pixel-surface);
  color: var(--pixel-text);
}
.tag-extra {
  background: var(--pixel-surface);
  color: var(--pixel-text-dim);
}
.tag-price {
  background: var(--pixel-surface);
  color: var(--pixel-text);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 12px;
}
.stat {
  display: flex;
  flex-direction: column;
  font-family: var(--pixel-font-text);
  font-size: 16px;
}
.stat .k {
  font-family: var(--pixel-font-en);
  font-size: 12px;
  color: var(--pixel-text-dim);
  letter-spacing: 0.5px;
}
.stat .v {
  font-size: 17px;
  color: var(--pixel-text);
}
.offline-msg {
  font-family: var(--pixel-font-en);
  font-size: 14px;
  color: var(--pixel-danger);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 4px;
}
.offline-msg small {
  font-family: var(--pixel-font-text);
  font-size: 14px;
}
.chip.ok {
  color: var(--pixel-ok);
  border-color: var(--pixel-ok);
}
.chip.warn {
  color: var(--pixel-warn);
  border-color: var(--pixel-warn);
}
.chip.danger {
  color: var(--pixel-danger);
  border-color: var(--pixel-danger);
}

/* ===== Mobile ===== */
@media (max-width: 640px) {
  .card.compact {
    padding: 8px 10px;
    gap: 6px;
  }
  /* metrics 行让两个速度换到下一行 */
  .c-row.metrics {
    flex-wrap: wrap;
    row-gap: 4px;
  }
  /* spacer 在 mobile 下作为换行符 —— flex-basis 100% 撑满本行 */
  .c-row.metrics > .spacer {
    flex: 1 0 100%;
    height: 0;
    margin: 0;
  }
  .c-row.metrics .speed {
    flex: 1;
    text-align: center;
  }
  /* compact 顶部行：名称收紧、避免到期 chip 被挤掉 */
  .c-name {
    max-width: none;
    flex: 1;
    min-width: 0;
  }
  /* compact 顶部行：到期 chip 缩字号 */
  .c-due {
    font-size: 12px;
    padding: 2px 4px;
  }
  /* detail 卡片 stats 3 列 → 2 列 */
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 380px) {
  .card.compact {
    padding: 6px 8px;
  }
  .m .k {
    width: 10px;
    font-size: 12px;
  }
  .m .v {
    width: 24px;
    font-size: 12px;
  }
  .c-row.metrics {
    gap: 6px;
  }
  .c-row.metrics .speed {
    font-size: 13px;
  }
  /* 紧凑模式国家旗标在极窄屏可以省掉 */
  .c-flag {
    font-size: 12px;
    padding: 1px 3px;
  }
}
</style>
