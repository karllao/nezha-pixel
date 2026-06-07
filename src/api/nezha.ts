import type {
  MetricPeriod,
  MetricType,
  MonitorPeriod,
  MonitorResponse,
  ServerGroupResponse,
  ServerMetricsResponse,
  ServiceResponse,
  SettingResponse,
} from "@/types/nezha";

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json()) as T & { error?: string };
  if ("error" in data && data.error) {
    throw new Error(data.error);
  }
  return data;
}

export const fetchServerGroup = () =>
  request<ServerGroupResponse>("/api/v1/server-group");

export const fetchService = () =>
  request<ServiceResponse>("/api/v1/service");

export const fetchSetting = () =>
  request<SettingResponse>("/api/v1/setting");

export const fetchMonitor = (
  serverId: number,
  period?: MonitorPeriod,
) => {
  const query = period ? `?period=${period}` : "";
  return request<MonitorResponse>(`/api/v1/server/${serverId}/service${query}`);
};

export const fetchServerMetrics = (
  serverId: number,
  metric: MetricType,
  period?: MetricPeriod,
) => {
  const query = period
    ? `?metric=${metric}&period=${period}`
    : `?metric=${metric}`;
  return request<ServerMetricsResponse>(
    `/api/v1/server/${serverId}/metrics${query}`,
  );
};
