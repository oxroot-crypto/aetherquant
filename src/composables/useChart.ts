import { ref, shallowRef, onMounted, onUnmounted, type Ref } from 'vue'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesPartialOptions,
  type HistogramSeriesPartialOptions,
  type LineSeriesPartialOptions,
  type Time,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts'
import type { OHLCV } from '@/types'

function readThemeColors() {
  const s = getComputedStyle(document.documentElement)
  return {
    bg: s.getPropertyValue('--chart-bg').trim() || '#1a1a2e',
    text: s.getPropertyValue('--chart-text').trim() || '#d1d4dc',
    grid: s.getPropertyValue('--chart-grid').trim() || '#2a2a3e',
    border: s.getPropertyValue('--chart-border').trim() || '#4a4a5e',
  }
}

function buildChartOptions(width: number, height: number) {
  const c = readThemeColors()
  return {
    width,
    height,
    layout: { background: { type: ColorType.Solid, color: c.bg }, textColor: c.text },
    grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: { borderColor: c.border, autoScale: true },
    timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false },
    handleScroll: { vertTouchDrag: false },
  }
}

const candleOptions: CandlestickSeriesPartialOptions = {
  upColor: '#00c853',
  downColor: '#ff1744',
  borderDownColor: '#ff1744',
  borderUpColor: '#00c853',
  wickDownColor: '#ff1744',
  wickUpColor: '#00c853',
}

const volumeOptions: HistogramSeriesPartialOptions = {
  priceFormat: { type: 'volume' as const },
  priceScaleId: '',
}

export interface LegendData {
  time: string
  open: string
  high: string
  low: string
  close: string
  volume: string
  percent: string
  color: string
}

const INDICATOR_STYLES: Record<string, LineSeriesPartialOptions> = {
  ma7: { color: '#ff9800', lineWidth: 1, priceLineVisible: false, lastValueVisible: true },
  ma25: { color: '#2196f3', lineWidth: 1, priceLineVisible: false, lastValueVisible: true },
  ema9: { color: '#e040fb', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, lineStyle: 2 },
  ema21: { color: '#7c4dff', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, lineStyle: 2 },
  bbUpper: { color: '#4caf50', lineWidth: 1, priceLineVisible: false, lineStyle: 2 },
  bbLower: { color: '#f44336', lineWidth: 1, priceLineVisible: false, lineStyle: 2 },
}

export function useChart(containerRef: Ref<HTMLElement | null>, onLegend?: (d: LegendData | null) => void) {
  const chart = shallowRef<IChartApi | null>(null)
  const candleSeries = shallowRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeries = shallowRef<ISeriesApi<'Histogram'> | null>(null)
  const indicatorLines = new Map<string, ISeriesApi<'Line'>>()

  let observer: MutationObserver | null = null
  let candleCache: { time: Time; o: number; h: number; l: number; c: number; v: number }[] = []

  function applyTheme() {
    if (!chart.value) return
    const c = readThemeColors()
    chart.value.applyOptions({
      layout: { background: { type: ColorType.Solid, color: c.bg }, textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
    })
    // Update indicator line colors on theme change
    for (const [key, series] of indicatorLines) {
      const style = INDICATOR_STYLES[key]
      if (style?.color) continue // static, no theme change needed
    }
  }

  onMounted(() => {
    if (!containerRef.value) return

    const c = createChart(
      containerRef.value,
      buildChartOptions(containerRef.value.clientWidth, containerRef.value.clientHeight),
    )

    const cs = c.addSeries(CandlestickSeries, candleOptions)
    const vs = c.addSeries(HistogramSeries, volumeOptions)
    vs.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

    // Crosshair legend
    c.subscribeCrosshairMove((param) => {
      if (!onLegend) return
      if (!param.time || param.point === undefined) {
        onLegend(null)
        return
      }
      const idx = candleCache.findIndex(d => d.time === param.time)
      if (idx < 0) { onLegend(null); return }
      const d = candleCache[idx]
      const prev = candleCache[idx > 0 ? idx - 1 : 0]
      const pct = prev.c ? (((d.c - prev.c) / prev.c) * 100).toFixed(2) : '0.00'
      const sign = Number(pct) >= 0 ? '+' : ''
      onLegend({
        time: new Date((param.time as number) * 1000).toLocaleString(),
        open: d.o.toFixed(2),
        high: d.h.toFixed(2),
        low: d.l.toFixed(2),
        close: d.c.toFixed(2),
        volume: d.v.toFixed(0),
        percent: sign + pct + '%',
        color: d.c >= d.o ? '#00c853' : '#ff1744',
      })
    })

    // Keyboard shortcuts
    containerRef.value.addEventListener('keydown', handleKeydown)
    containerRef.value.tabIndex = 0

    chart.value = c
    candleSeries.value = cs
    volumeSeries.value = vs

    observer = new MutationObserver(applyTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    observer?.disconnect()
    window.removeEventListener('resize', handleResize)
    containerRef.value?.removeEventListener('keydown', handleKeydown)
    chart.value?.remove()
  })

  function handleKeydown(e: KeyboardEvent) {
    if (!chart.value) return
    const ts = chart.value.timeScale()
    switch (e.key) {
      case 'r':
      case 'R':
        ts.resetTimeScale()
        e.preventDefault()
        break
      case '+':
      case '=':
        ts.applyOptions({ barSpacing: (ts.options().barSpacing ?? 12) + 2 })
        e.preventDefault()
        break
      case '-':
        ts.applyOptions({ barSpacing: Math.max(2, (ts.options().barSpacing ?? 12) - 2) })
        e.preventDefault()
        break
      case 'ArrowLeft': {
        const lr = ts.getVisibleLogicalRange()
        if (lr) ts.setVisibleLogicalRange({ from: lr.from - 5, to: lr.to - 5 })
        e.preventDefault()
        break
      }
      case 'ArrowRight': {
        const lr = ts.getVisibleLogicalRange()
        if (lr) ts.setVisibleLogicalRange({ from: lr.from + 5, to: lr.to + 5 })
        e.preventDefault()
        break
      }
      case 'f':
      case 'F':
        ts.fitContent()
        e.preventDefault()
        break
    }
  }

  function handleResize() {
    if (!containerRef.value || !chart.value) return
    chart.value.applyOptions({
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight,
    })
  }

  function setData(data: OHLCV[]) {
    if (!candleSeries.value || !volumeSeries.value || !chart.value) return

    const candleData = data.map(d => ({
      time: (d.timestamp / 1000) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candleCache = data.map(d => ({
      time: (d.timestamp / 1000) as Time,
      o: d.open,
      h: d.high,
      l: d.low,
      c: d.close,
      v: d.volume,
    }))

    candleSeries.value.setData(candleData)
    volumeSeries.value.setData(data.map(d => ({
      time: (d.timestamp / 1000) as Time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 23, 68, 0.3)',
    })))

    const visibleBars = Math.min(60, data.length)
    if (data.length > visibleBars) {
      const from = (data[data.length - visibleBars].timestamp / 1000) as Time
      const to = (data[data.length - 1].timestamp / 1000) as Time
      chart.value.timeScale().setVisibleRange({ from, to })
    } else {
      chart.value.timeScale().fitContent()
    }
  }

  function setIndicator(key: string, data: OHLCV[], field: (d: OHLCV, i: number) => number) {
    if (!chart.value) return
    const lineData = data
      .map((d, i) => ({
        time: (d.timestamp / 1000) as Time,
        value: field(d, i),
      }))
      .filter(p => Number.isFinite(p.value))

    const existing = indicatorLines.get(key)
    if (existing) {
      existing.setData(lineData)
    } else {
      const opts = INDICATOR_STYLES[key] ?? { color: '#888', lineWidth: 1, priceLineVisible: false }
      const series = chart.value.addSeries(LineSeries, opts)
      series.setData(lineData)
      indicatorLines.set(key, series)
    }
  }

  function clearIndicators() {
    for (const [key, series] of indicatorLines) {
      chart.value?.removeSeries(series)
    }
    indicatorLines.clear()
  }

  return { chart, candleSeries, volumeSeries, setData, setIndicator, clearIndicators }
}
