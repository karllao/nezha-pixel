import type { ApiResponse, CycleTransferData, MetricPeriod, MetricType, NezhaMonitor, ServerGroup, ServerMetricsData, ServiceData } from "./types";

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const data = await response.json() as T & { error?: string };
  if (data.error) throw new Error(data.error);
  return data;
}

export const fetchSetting = () => request<ApiResponse<{ config: { language: string; site_name: string }; version: string; tsdb_enabled?: boolean }>>("/api/v1/setting");
export const fetchServerGroup = () => request<ApiResponse<ServerGroup[]>>("/api/v1/server-group");
export const fetchService = () => request<ApiResponse<{ services: Record<string,ServiceData>; cycle_transfer_stats: Record<string,CycleTransferData> }>>("/api/v1/service");
export const fetchMonitor = (id: number, period = "1d") => request<ApiResponse<NezhaMonitor[]>>(`/api/v1/server/${id}/service?period=${period}`);
export const fetchServerMetrics = (id: number, metric: MetricType, period: MetricPeriod) => request<ApiResponse<ServerMetricsData>>(`/api/v1/server/${id}/metrics?metric=${metric}&period=${period}`);
