import type { NezhaServer } from "./types";

const units = ["B", "KB", "MB", "GB", "TB", "PB"];
export function formatBytes(value: number, decimals = 2): string {
  if (!value || value < 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** i).toFixed(decimals)} ${units[i]}`;
}
export const formatSpeed = (v: number) => `${formatBytes(v)}/s`;
export function formatUptime(seconds: number): string {
  if (!seconds || seconds < 0) return "-";
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}
export const formatTime = (ts: number) => ts ? new Date(ts).toLocaleString() : "-";
export const esc = (v: unknown) => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]!));

function stableNote(id: number, note: string): string {
  const key = `nezha-pocket:note:${id}`;
  if (note) { try { sessionStorage.setItem(key, note); } catch {} return note; }
  try { return sessionStorage.getItem(key) || ""; } catch { return ""; }
}
export function serverInfo(now: number, s: NezhaServer) {
  const state = s.state || {} as NezhaServer["state"], host = s.host || {} as NezhaServer["host"];
  const last = s.last_active?.startsWith("000") ? 0 : new Date(s.last_active).getTime();
  return { ...s, public_note: stableNote(s.id, s.public_note || ""), online: now - last <= 30000,
    cpu: state.cpu || 0, mem: host.mem_total ? state.mem_used / host.mem_total * 100 : 0, disk: host.disk_total ? state.disk_used / host.disk_total * 100 : 0, swap: host.swap_total ? state.swap_used / host.swap_total * 100 : 0,
    up: state.net_out_speed || 0, down: state.net_in_speed || 0, uptime: state.uptime || 0, process: state.process_count || 0, tcp: state.tcp_conn_count || 0, udp: state.udp_conn_count || 0,
    mem_used: state.mem_used || 0, mem_total: host.mem_total || 0, swap_used: state.swap_used || 0, swap_total: host.swap_total || 0, disk_used: state.disk_used || 0, disk_total: host.disk_total || 0,
    net_out_transfer: state.net_out_transfer || 0, net_in_transfer: state.net_in_transfer || 0, load_1: state.load_1 || 0, load_5: state.load_5 || 0, load_15: state.load_15 || 0,
    platform: host.platform || "", platform_version: host.platform_version || "", arch: host.arch || "", version: host.version || "", boot_time: host.boot_time || 0, cpu_info: host.cpu || [], gpu_info: host.gpu || [], temperatures: state.temperatures || [], last_active_text: last ? new Date(last).toLocaleString() : "" };
}
export interface PublicNote { billingDataMod?: { startDate:string; endDate:string; autoRenewal:string; cycle:string; amount:string }; planDataMod?: { bandwidth:string; trafficVol:string; trafficType:string; IPv4:string; IPv6:string; networkRoute:string; extra:string } }
export function parsePublicNote(note: string): PublicNote | null {
  if (!note?.trim()) return null;
  try { const raw = note.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#34;/g, '"'); const value = JSON.parse(raw); return value?.billingDataMod || value?.planDataMod ? value : null; } catch { return null; }
}
export function billingInfo(b?: PublicNote["billingDataMod"]) {
  if (!b?.endDate) return null;
  if (b.endDate.startsWith("0000-00-00")) return { never: true, expired: false, days: 0 };
  const end = new Date(b.endDate).getTime(), now = Date.now();
  if (b.autoRenewal !== "1") { const days = Math.round((end-now)/86400000); return { never:false, expired:days<0, days }; }
  const cycle = /year|annual|年|^y$/i.test(b.cycle) ? 12 : /quarter|季|^q$/i.test(b.cycle) ? 3 : /half|半年|^h$/i.test(b.cycle) ? 6 : 1;
  let next = end; while (next <= now) { const d = new Date(next); d.setMonth(d.getMonth()+cycle); next=d.getTime(); }
  return { never:false, expired:false, days:Math.round((next-now)/86400000) };
}
export const level = (v:number) => v >= 85 ? "danger" : v >= 60 ? "warn" : "ok";
