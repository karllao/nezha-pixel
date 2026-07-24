export type Locale = "zh-CN" | "en";
const zh: Record<string,string> = {
  servers:"服务器", services:"服务监控", admin:"后台", online:"在线", offline:"离线", connecting:"正在连接数据流...", reconnect:"重连", total:"总计", netUp:"上行", netDown:"下行", time:"时间", live:"实时", traffic:"累计流量",
  overview:"全局状态", all:"全部", status:"状态", sort:"排序", default:"默认", name:"名称", cpu:"CPU", memory:"内存", disk:"硬盘", up:"上行", down:"下行", compact:"紧凑", detail:"详细", noServers:"当前筛选下暂无服务器",
  load:"负载", uptime:"运行时长", lastSeen:"最后在线", expired:"已过期", days:"天", forever:"无期限", free:"免费", usage:"按量计费", back:"返回", serverMissing:"当前数据流中未找到该服务器", system:"系统", host:"主机", network:"网络", platform:"平台", arch:"架构", agent:"Agent", region:"区域", boot:"启动时间", swap:"交换分区", temperature:"温度", transfer:"总流量", connections:"TCP / UDP", processes:"进程数", history:"历史指标", realtime:"实时", day:"1天", week:"7天", month:"30天", monitors:"服务探针", tsdbOff:"TSDB 未启用，仅可查看实时数据",
  serviceTitle:"服务与周期流量", refresh:"刷新", loading:"正在读取服务数据...", uptimeMonitors:"可用率监控", cycleTraffic:"周期流量", currentUp:"当前正常", currentDown:"当前异常", avgDelay:"平均延迟", next:"下次", noServices:"暂未配置服务监控或周期流量", error:"读取失败", notFound:"页面未找到", home:"返回首页", theme:"切换主题", language:"切换语言", powered:"由 Nezha 驱动"
};
const en: Record<string,string> = {
  servers:"SERVERS", services:"SERVICES", admin:"ADMIN", online:"ONLINE", offline:"OFFLINE", connecting:"CONNECTING DATA LINK...", reconnect:"RETRY", total:"TOTAL", netUp:"NET UP", netDown:"NET DOWN", time:"TIME", live:"LIVE", traffic:"TRANSFER",
  overview:"GLOBAL STATUS", all:"ALL", status:"STATUS", sort:"SORT", default:"DEFAULT", name:"NAME", cpu:"CPU", memory:"MEMORY", disk:"DISK", up:"UP", down:"DOWN", compact:"COMPACT", detail:"DETAIL", noServers:"NO SERVERS MATCH THIS FILTER",
  load:"LOAD", uptime:"UPTIME", lastSeen:"LAST SEEN", expired:"EXPIRED", days:"D", forever:"FOREVER", free:"FREE", usage:"USAGE-BASED", back:"BACK", serverMissing:"SERVER NOT FOUND IN CURRENT DATA STREAM", system:"SYSTEM", host:"HOST", network:"NETWORK", platform:"PLATFORM", arch:"ARCH", agent:"AGENT", region:"REGION", boot:"BOOT TIME", swap:"SWAP", temperature:"TEMP", transfer:"TRANSFER", connections:"TCP / UDP", processes:"PROCESSES", history:"METRIC HISTORY", realtime:"REALTIME", day:"1D", week:"7D", month:"30D", monitors:"SERVICE PROBES", tsdbOff:"TSDB DISABLED, REALTIME ONLY",
  serviceTitle:"SERVICES & CYCLE TRAFFIC", refresh:"REFRESH", loading:"LOADING SERVICE DATA...", uptimeMonitors:"UPTIME MONITORS", cycleTraffic:"CYCLE TRAFFIC", currentUp:"CURRENT UP", currentDown:"CURRENT DOWN", avgDelay:"AVG DELAY", next:"NEXT", noServices:"NO SERVICES OR CYCLE TRAFFIC CONFIGURED", error:"REQUEST FAILED", notFound:"PAGE NOT FOUND", home:"BACK HOME", theme:"TOGGLE THEME", language:"SWITCH LANGUAGE", powered:"Powered by Nezha"
};
export let locale: Locale = (localStorage.getItem("nezha-pocket-locale") as Locale) || (navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en");
export const t = (key:string) => (locale === "zh-CN" ? zh : en)[key] || key;
export function toggleLocale() { locale = locale === "zh-CN" ? "en" : "zh-CN"; localStorage.setItem("nezha-pocket-locale", locale); document.documentElement.lang = locale; }
export function useBackendLocale(value:string) { if (!localStorage.getItem("nezha-pocket-locale")) { locale = value.toLowerCase().startsWith("zh") ? "zh-CN" : "en"; document.documentElement.lang=locale; } }
