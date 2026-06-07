<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useWebSocketStore } from "@/composables/websocket";
import { useI18n } from "@/composables/i18n";
import { fetchServerGroup } from "@/api/nezha";
import type { ServerGroup, NezhaServer } from "@/types/nezha";
import { formatNezhaInfo } from "@/utils/format";
import StatsOverview from "@/components/StatsOverview.vue";
import ServerCard from "@/components/ServerCard.vue";
import GroupTabs from "@/components/GroupTabs.vue";

const ws = useWebSocketStore();
const { t } = useI18n();
const { servers, now, connected, lastMessage } = storeToRefs(ws);

const groups = ref<ServerGroup[]>([]);
const currentGroup = ref<string>(
  sessionStorage.getItem("nezha-pixel-group") || "__ALL__",
);
const sortBy = ref<"default" | "name" | "cpu" | "mem" | "disk" | "up" | "down">(
  "default",
);
const statusFilter = ref<"all" | "online" | "offline">("all");
const viewMode = ref<"compact" | "detail">(
  (localStorage.getItem("nezha-pixel-view") as "compact" | "detail") ||
    "compact",
);

function setViewMode(v: "compact" | "detail") {
  viewMode.value = v;
  localStorage.setItem("nezha-pixel-view", v);
}

onMounted(async () => {
  try {
    const res = await fetchServerGroup();
    groups.value = res.data || [];
  } catch (err) {
    console.warn("fetchServerGroup failed", err);
  }
});

const tabs = computed<{ id: string; label: string }[]>(() => {
  const arr = [{ id: "__ALL__", label: t("group.all") }];
  for (const g of groups.value) {
    if (
      Array.isArray(g.servers) &&
      g.servers.some((sid) => servers.value.some((s) => s.id === sid))
    ) {
      arr.push({ id: g.group.name, label: g.group.name });
    }
  }
  return arr;
});

function setGroup(name: string) {
  currentGroup.value = name;
  sessionStorage.setItem("nezha-pixel-group", name);
}

const filtered = computed<NezhaServer[]>(() => {
  let list = servers.value.slice();
  if (currentGroup.value !== "__ALL__") {
    const g = groups.value.find((g) => g.group.name === currentGroup.value);
    if (g) {
      const set = new Set(g.servers);
      list = list.filter((s) => set.has(s.id));
    }
  }
  if (statusFilter.value !== "all") {
    list = list.filter((s) => {
      const online = formatNezhaInfo(now.value, s).online;
      return statusFilter.value === "online" ? online : !online;
    });
  }
  list.sort((a, b) => {
    const ai = formatNezhaInfo(now.value, a);
    const bi = formatNezhaInfo(now.value, b);
    if (sortBy.value !== "name") {
      if (ai.online && !bi.online) return -1;
      if (!ai.online && bi.online) return 1;
    }
    switch (sortBy.value) {
      case "name":
        return a.name.localeCompare(b.name);
      case "cpu":
        return bi.cpu - ai.cpu;
      case "mem":
        return bi.mem - ai.mem;
      case "disk":
        return bi.disk - ai.disk;
      case "up":
        return bi.up - ai.up;
      case "down":
        return bi.down - ai.down;
      default:
        return 0;
    }
  });
  return list;
});
</script>

<template>
  <div class="home">
    <div v-if="!connected && !lastMessage" class="loading pixel-border">
      <span class="blink">▶ {{ t("status.connecting") }}</span>
    </div>

    <template v-else>
      <StatsOverview :servers="servers" :now="now" />

      <div class="toolbar">
        <GroupTabs
          :tabs="tabs"
          :current="currentGroup"
          @update:current="setGroup"
        />
        <div class="spacer" />
        <div class="filters">
          <div class="view-toggle">
            <button
              class="chip"
              :class="{ active: viewMode === 'compact' }"
              @click="setViewMode('compact')"
              :title="t('filter.compact')"
            >
              ▤ {{ t("filter.compact") }}
            </button>
            <button
              class="chip"
              :class="{ active: viewMode === 'detail' }"
              @click="setViewMode('detail')"
              :title="t('filter.detail')"
            >
              ▦ {{ t("filter.detail") }}
            </button>
          </div>
          <label class="chip">
            {{ t("filter.status") }}:
            <select v-model="statusFilter">
              <option value="all">{{ t("filter.all") }}</option>
              <option value="online">{{ t("filter.online") }}</option>
              <option value="offline">{{ t("filter.offline") }}</option>
            </select>
          </label>
          <label class="chip">
            {{ t("filter.sort") }}:
            <select v-model="sortBy">
              <option value="default">{{ t("sort.default") }}</option>
              <option value="name">{{ t("sort.name") }}</option>
              <option value="cpu">{{ t("sort.cpu") }}</option>
              <option value="mem">{{ t("sort.mem") }}</option>
              <option value="disk">{{ t("sort.disk") }}</option>
              <option value="up">{{ t("sort.up") }}</option>
              <option value="down">{{ t("sort.down") }}</option>
            </select>
          </label>
        </div>
      </div>

      <section
        v-if="filtered.length"
        class="cards"
        :class="viewMode === 'compact' ? 'grid grid-2-compact' : 'grid grid-2'"
      >
        <ServerCard
          v-for="s in filtered"
          :key="s.id"
          :server="s"
          :now="now"
          :compact="viewMode === 'compact'"
        />
      </section>
      <div v-else class="empty pixel-border">
        <span>{{ t("empty.servers") }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.loading {
  padding: 40px;
  text-align: center;
  font-family: var(--pixel-font-en);
  font-size: 11px;
  color: var(--pixel-accent);
}
.blink {
  animation: blink 1s steps(2) infinite;
}
@keyframes blink {
  50% {
    opacity: 0.3;
  }
}
.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.view-toggle {
  display: flex;
  gap: 0;
}
.view-toggle .chip {
  cursor: pointer;
}
.view-toggle .chip.active {
  background: var(--pixel-accent);
  color: var(--pixel-on-accent);
  border-color: var(--pixel-accent);
}
.filters select {
  background: var(--pixel-bg);
  color: var(--pixel-text);
  border: none;
  font-family: var(--pixel-font-en);
  font-size: 9px;
  text-transform: uppercase;
  outline: none;
  cursor: pointer;
}
.empty {
  padding: 40px;
  text-align: center;
  font-family: var(--pixel-font-en);
  font-size: 12px;
  color: var(--pixel-text-dim);
}
.cards {
  margin-top: 4px;
}
.grid-2-compact {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
@media (max-width: 768px) {
  .grid-2-compact {
    grid-template-columns: 1fr;
  }
}
</style>
