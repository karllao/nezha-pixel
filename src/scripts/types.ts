export interface NezhaWebsocketResponse { now: number; servers: NezhaServer[] }
export interface NezhaServer {
  id: number; name: string; public_note: string; last_active: string; country_code: string;
  host: { platform: string; platform_version: string; cpu: string[]; gpu: string[]; mem_total: number; disk_total: number; swap_total: number; arch: string; boot_time: number; version: string };
  state: { cpu: number; mem_used: number; swap_used: number; disk_used: number; net_in_transfer: number; net_out_transfer: number; net_in_speed: number; net_out_speed: number; uptime: number; load_1: number; load_5: number; load_15: number; tcp_conn_count: number; udp_conn_count: number; process_count: number; temperatures: { Name: string; Temperature: number }[]; gpu: number[] };
}
export interface ServerGroup { group: { id: number; name: string }; servers: number[] }
export interface NezhaMonitor { monitor_id: number; monitor_name: string; server_id: number; server_name: string; created_at: number[]; avg_delay: number[]; packet_loss?: number[] }
export interface ServiceData { service_name: string; current_up: number; current_down: number; total_up: number; total_down: number; delay: number[]; up: number[]; down: number[] }
export interface CycleTransferData { name: string; from: string | Record<string,string>; to: string | Record<string,string>; max: number | Record<string,number>; min: number | Record<string,number>; server_name: Record<string,string>; transfer: Record<string,number>; next_update: Record<string,string> }
export type MetricType = "cpu" | "memory" | "disk" | "net_in_speed" | "net_out_speed";
export type MetricPeriod = "1d" | "7d" | "30d";
export interface MetricDataPoint { ts: number; value: number }
export interface ServerMetricsData { server_id: number; server_name: string; metric: string; data_points: MetricDataPoint[] }
export interface ApiResponse<T> { success: boolean; data: T; error?: string }
export interface NezhaSettingConfig { language: string; site_name: string; custom_code?: string; user_template?: string }
export interface NezhaSetting { config: NezhaSettingConfig; version: string; tsdb_enabled?: boolean }
