import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { displayTime, type Snapshot } from '../data/model'
echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

export default function RiskChart({ snapshots, horizon, index }: { snapshots: Snapshot[]; horizon: number; index: number }) {
  const node = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!node.current) return
    const chart = echarts.init(node.current)
    chart.setOption({ animationDuration: 600, grid: { left: 2, right: 10, top: 16, bottom: 20, containLabel: false }, xAxis: { type: 'category', data: snapshots.map(s => displayTime(s.time)), boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#8a9ab2', fontSize: 10, margin: 10 } }, yAxis: { type: 'value', min: 0, max: 100, show: false }, tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => v == null ? '暂无结果' : `${v}%` }, series: [{ type: 'line', smooth: true, connectNulls: false, symbol: 'circle', symbolSize: 6, data: snapshots.map((s, i) => ({ value: s.risks[horizon] === null ? null : Math.round(s.risks[horizon]! * 100), itemStyle: { color: i === index ? '#ec759e' : '#94b7e4' } })), lineStyle: { width: 2.5, color: '#84aee0' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(132,174,224,.32)' }, { offset: 1, color: 'rgba(132,174,224,0)' }]) } }] })
    const observer = new ResizeObserver(() => chart.resize()); observer.observe(node.current)
    return () => { observer.disconnect(); chart.dispose() }
  }, [snapshots, horizon, index])
  return <div className="risk-chart" ref={node} role="img" aria-label="所选预测窗口的历史风险趋势" />
}
