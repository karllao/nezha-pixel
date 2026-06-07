import { computed, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useWebSocketStore } from "@/composables/websocket";
import { formatNezhaInfo } from "@/utils/format";

export interface RealtimePoint {
  ts: number;
  cpu: number;
  mem: number;
  disk: number;
  net_in_speed: number;
  net_out_speed: number;
  load_1: number;
}

const MAX_POINTS = 120; // ~10 min @ 5s push interval

export function useRealtimeMetrics(serverId: () => number) {
  const ws = useWebSocketStore();
  const { servers, now } = storeToRefs(ws);
  const points = ref<RealtimePoint[]>([]);

  const stop = watch(
    [() => now.value, servers],
    () => {
      const id = serverId();
      const s = servers.value.find((x) => x.id === id);
      if (!s || !now.value) return;
      const info = formatNezhaInfo(now.value, s);
      const last = points.value[points.value.length - 1];
      if (last && last.ts === now.value) return; // dedupe
      points.value.push({
        ts: now.value,
        cpu: info.cpu,
        mem: info.mem,
        disk: info.disk,
        net_in_speed: info.down,
        net_out_speed: info.up,
        load_1: Number(info.load_1) || 0,
      });
      if (points.value.length > MAX_POINTS) {
        points.value.splice(0, points.value.length - MAX_POINTS);
      }
    },
    { immediate: true },
  );

  watch(
    () => serverId(),
    () => {
      points.value = [];
    },
  );

  onUnmounted(() => stop());

  const series = computed(() => ({
    cpu: points.value.map((p) => ({ ts: p.ts, value: p.cpu })),
    memory: points.value.map((p) => ({ ts: p.ts, value: p.mem })),
    disk: points.value.map((p) => ({ ts: p.ts, value: p.disk })),
    net_in_speed: points.value.map((p) => ({ ts: p.ts, value: p.net_in_speed })),
    net_out_speed: points.value.map((p) => ({ ts: p.ts, value: p.net_out_speed })),
  }));

  return { points, series };
}
