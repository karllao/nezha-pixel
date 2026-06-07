import dayjs from "dayjs";
import type { NezhaServer } from "@/types/nezha";

export function parseISOTimestamp(isoString: string): number {
  return new Date(isoString).getTime();
}

/**
 * nezha 后端 WS 推送的 public_note 字段会间歇性为空 —— 用 sessionStorage
 * 缓存最近一次非空值，避免渲染时套餐 / 过期信息闪一下就消失。
 * 参考: nezha-dash-v2 src/lib/utils.ts handlePublicNote
 */
export function handlePublicNote(serverId: number, publicNote: string): string {
  if (typeof sessionStorage === "undefined") return publicNote || "";
  const key = `nezha-pixel:note:${serverId}`;
  const stored = sessionStorage.getItem(key);
  if (publicNote) {
    if (publicNote !== stored) {
      try {
        sessionStorage.setItem(key, publicNote);
      } catch {
        // sessionStorage full or disabled — ignore
      }
    }
    return publicNote;
  }
  return stored || "";
}

export function formatNezhaInfo(now: number, serverInfo: NezhaServer) {
  const lastActiveTime = serverInfo.last_active.startsWith("000")
    ? 0
    : parseISOTimestamp(serverInfo.last_active);
  const state = serverInfo.state || ({} as NezhaServer["state"]);
  const host = serverInfo.host || ({} as NezhaServer["host"]);
  const stablePublicNote = handlePublicNote(
    serverInfo.id,
    serverInfo.public_note || "",
  );
  return {
    ...serverInfo,
    public_note: stablePublicNote,
    cpu: state.cpu || 0,
    process: state.process_count || 0,
    up: state.net_out_speed || 0,
    down: state.net_in_speed || 0,
    online: now - lastActiveTime <= 30000,
    last_active_time_string: lastActiveTime
      ? dayjs(lastActiveTime).format("YYYY-MM-DD HH:mm:ss")
      : "",
    uptime: state.uptime || 0,
    version: host.version || "",
    tcp: state.tcp_conn_count || 0,
    udp: state.udp_conn_count || 0,
    mem: host.mem_total ? (state.mem_used / host.mem_total) * 100 : 0,
    swap: host.swap_total ? (state.swap_used / host.swap_total) * 100 : 0,
    disk: host.disk_total ? (state.disk_used / host.disk_total) * 100 : 0,
    mem_total: host.mem_total || 0,
    mem_used: state.mem_used || 0,
    swap_total: host.swap_total || 0,
    swap_used: state.swap_used || 0,
    disk_total: host.disk_total || 0,
    disk_used: state.disk_used || 0,
    platform: host.platform || "",
    platform_version: host.platform_version || "",
    arch: host.arch || "",
    net_out_transfer: state.net_out_transfer || 0,
    net_in_transfer: state.net_in_transfer || 0,
    boot_time: host.boot_time || 0,
    cpu_info: host.cpu || [],
    gpu_info: host.gpu || [],
    load_1: Number((state.load_1 ?? 0).toFixed(2)),
    load_5: Number((state.load_5 ?? 0).toFixed(2)),
    load_15: Number((state.load_15 ?? 0).toFixed(2)),
  };
}

export type FormattedServer = ReturnType<typeof formatNezhaInfo>;

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];
export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes < 0) return "0 B";
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / 1024 ** i;
  return `${value.toFixed(decimals)} ${UNITS[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec, 2)}/s`;
}

export function formatUptime(seconds: number): string {
  if (!seconds || seconds < 0) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTime(timestamp: number): string {
  if (!timestamp) return "-";
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss");
}

export function levelColor(percent: number): "ok" | "warn" | "danger" {
  if (percent >= 85) return "danger";
  if (percent >= 60) return "warn";
  return "ok";
}

export interface BillingMod {
  startDate: string;
  endDate: string;
  autoRenewal: string;
  cycle: string;
  amount: string;
}

export interface PlanMod {
  bandwidth: string;
  trafficVol: string;
  trafficType: string;
  IPv4: string;
  IPv6: string;
  networkRoute: string;
  extra: string;
}

export interface PublicNoteData {
  billingDataMod?: BillingMod;
  planDataMod?: PlanMod;
}

export function parsePublicNote(note: string): PublicNoteData | null {
  if (!note) return null;
  let raw = note.trim();
  if (!raw) return null;
  // Some deployments html-escape the note; cheap unescape for the common cases.
  if (raw.startsWith("&quot;") || raw.includes("&quot;")) {
    raw = raw
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#34;/g, '"');
  }
  if (!raw.startsWith("{")) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    if (!data.billingDataMod && !data.planDataMod) return null;
    const result: PublicNoteData = {};
    if (data.billingDataMod) {
      result.billingDataMod = {
        startDate: data.billingDataMod.startDate || "",
        endDate: data.billingDataMod.endDate || "",
        autoRenewal: String(data.billingDataMod.autoRenewal ?? ""),
        cycle: data.billingDataMod.cycle || "",
        amount: String(data.billingDataMod.amount ?? ""),
      };
    }
    if (data.planDataMod) {
      result.planDataMod = {
        bandwidth: data.planDataMod.bandwidth || "",
        trafficVol: data.planDataMod.trafficVol || "",
        trafficType: data.planDataMod.trafficType || "",
        IPv4: String(data.planDataMod.IPv4 ?? ""),
        IPv6: String(data.planDataMod.IPv6 ?? ""),
        networkRoute: data.planDataMod.networkRoute || "",
        extra: data.planDataMod.extra || "",
      };
    }
    return result;
  } catch {
    return null;
  }
}

export interface BillingInfoResult {
  isNeverExpire: boolean;
  daysLeft: number;
  remainingPercentage: number;
  cycleLabel: string;
  expired: boolean;
}

function cycleMonths(cycle: string): { months: number; label: string } {
  switch ((cycle || "").toLowerCase()) {
    case "月":
    case "m":
    case "mo":
    case "month":
    case "monthly":
      return { months: 1, label: "月" };
    case "年":
    case "y":
    case "yr":
    case "year":
    case "annual":
      return { months: 12, label: "年" };
    case "季":
    case "q":
    case "qr":
    case "quarterly":
      return { months: 3, label: "季" };
    case "半":
    case "半年":
    case "h":
    case "half":
    case "semi-annually":
      return { months: 6, label: "半年" };
    default:
      return { months: 1, label: cycle || "" };
  }
}

export function computeBillingInfo(b: BillingMod): BillingInfoResult {
  const result: BillingInfoResult = {
    isNeverExpire: false,
    daysLeft: 0,
    remainingPercentage: 0,
    cycleLabel: "",
    expired: false,
  };
  if (!b?.endDate) return result;
  if (b.endDate.startsWith("0000-00-00")) {
    result.isNeverExpire = true;
    result.remainingPercentage = 1;
    return result;
  }

  const { months, label } = cycleMonths(b.cycle);
  result.cycleLabel = label;

  const now = Date.now();
  const end = new Date(b.endDate).getTime();
  const oneDay = 86400000;

  if (b.autoRenewal !== "1") {
    const days = Math.round((end - now) / oneDay);
    result.daysLeft = days;
    result.expired = days < 0;
    if (b.startDate) {
      const span =
        (end - new Date(b.startDate).getTime()) / oneDay || 30 * months;
      result.remainingPercentage = Math.max(
        0,
        Math.min(1, days / span),
      );
    }
    return result;
  }

  // auto renewal
  if (now < end) {
    const days = Math.round((end - now) / oneDay);
    result.daysLeft = days;
    result.remainingPercentage = Math.min(1, days / (30 * months));
    return result;
  }
  // already past end -> compute next renewal
  let next = end;
  while (next <= now) {
    const d = new Date(next);
    d.setMonth(d.getMonth() + months);
    next = d.getTime();
  }
  const days = Math.round((next - now) / oneDay);
  result.daysLeft = days;
  result.remainingPercentage = Math.min(1, days / (30 * months));
  return result;
}
