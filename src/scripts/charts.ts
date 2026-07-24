import { esc } from "./format";
import type { MetricDataPoint } from "./types";

export function chart(points: MetricDataPoint[], label: string, format: "percent"|"bytes"|"ms"|"raw"="raw", color="cyan", yMax?:number): string {
  const vals=points.map(p=>Number(p.value)||0), max=yMax || Math.max(...vals,1), min=Math.min(...vals,0), range=max-min||1;
  let path=points.map((p,i)=>`${i?"L":"M"}${(i/Math.max(points.length-1,1)*600).toFixed(1)},${(112-(p.value-min)/range*104).toFixed(1)}`).join(" ");
  if(points.length===1) path += ` L600,${(112-(points[0].value-min)/range*104).toFixed(1)}`;
  const last=vals.at(-1)||0, value=formatValue(last,format);
  const data=esc(JSON.stringify(points));
  return `<article class="pixel-panel chart" data-chart='${data}' data-format="${format}"><header><span>${esc(label)}</span><strong style="color:var(--${color})">${value}</strong></header><div class="chart-stage"><svg viewBox="0 0 600 120" preserveAspectRatio="none" aria-label="${esc(label)} chart"><path class="chart-grid" d="M0 30H600M0 60H600M0 90H600M150 0V120M300 0V120M450 0V120"/><path class="chart-fill" style="fill:var(--${color})" d="${path} L600,120 L0,120Z"/><path class="chart-line" style="stroke:var(--${color})" d="${path}"/></svg><div class="chart-cursor" hidden></div><output class="chart-tip" hidden></output></div></article>`;
}
export function formatValue(v:number, format:string) { if(format==="percent")return `${v.toFixed(1)}%`; if(format==="ms")return `${v.toFixed(1)} ms`; if(format==="bytes") { const u=["B/s","KB/s","MB/s","GB/s"]; let i=0; while(Math.abs(v)>=1024&&i<3){v/=1024;i++;} return `${v.toFixed(i?2:0)} ${u[i]}`; } return v.toFixed(2); }
