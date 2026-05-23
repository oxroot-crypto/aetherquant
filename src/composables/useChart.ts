/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * K线图 composable——全平台最复杂个一只 composable。封装哩 lightweight-charts
 * （TradingView 出品个图表库）个全套生命周期：创建/销毁图表、蜡烛序列、
 * 成交量柱、主题跟色（用 MutationObserver 监听 data-theme 变化）、
 * 十字光标图例（鼠标划过就显示 O/H/L/C/V 加涨跌幅）、指标线叠加、
 * 键盘快捷键——R 重置 / +/- 缩放 / 方向键平移 / F 缩放适应。
 *
 * 几只关键设计决策：
 * - 图表实例用 shallowRef 不消 ref——渠是 mutable 个，深度代理反而坏事
 * - candleCache 内存缓存一份 OHLCV，十字光标划过去 O(1) 就查得到
 * - 指标线用 Map 管，key 对到 INDICATOR_STYLES 表里个样式，同 key 重复调
 *   setIndicator 会更新数据而不会重复建线
 */

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

/**
 * 从 <html> 的 CSS 自定义属性中读取当前主题配色。
 * 每个属性都有 fallback 值，防止 CSS 变量未定义时图表变白屏。
 * 返回的都是纯色字符串（如 "#1a1a2e"），直接给图表 API 用。
 */
function readThemeColors() {
  const s = getComputedStyle(document.documentElement)
  return {
    bg: s.getPropertyValue('--chart-bg').trim() || '#1a1a2e',
    text: s.getPropertyValue('--chart-text').trim() || '#d1d4dc',
    grid: s.getPropertyValue('--chart-grid').trim() || '#2a2a3e',
    border: s.getPropertyValue('--chart-border').trim() || '#4a4a5e',
  }
}

/**
 * 构建 lightweight-charts 初始化配置项。
 * 自动跟随当前主题颜色生成统一的图表外观。
 * 十字光标用 Normal 模式（同时显示竖线和横线），
 * 时间轴显示日期，不显示秒。
 */
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
    handleScroll: { vertTouchDrag: false }, // 禁止垂直拖拽，只保留水平滚动
  }
}

/** 蜡烛图样式。阳线绿色（涨），阴线红色（跌），跟国内习惯保持一致。 */
const candleOptions: CandlestickSeriesPartialOptions = {
  upColor: '#00c853',
  downColor: '#ff1744',
  borderDownColor: '#ff1744',
  borderUpColor: '#00c853',
  wickDownColor: '#ff1744',
  wickUpColor: '#00c853',
}

/** 成交量柱状图样式。用 volume 专用格式，放在底部独立刻度。 */
const volumeOptions: HistogramSeriesPartialOptions = {
  priceFormat: { type: 'volume' as const },
  priceScaleId: '', // 空字符串 = 创建一个新的独立 priceScale（独立于价格轴）
}

/** 十字光标图例数据——传递给外部回调在 UI 渲染显示 */
export interface LegendData {
  time: string       // 格式化后个时间字符串
  open: string       // 开盘价
  high: string       // 最高价
  low: string        // 最低价
  close: string      // 收盘价
  volume: string     // 成交量
  percent: string    // 相对前一根的涨跌幅（带正负号）
  color: string      // 根据涨跌红绿着色
}

/**
 * 指标线样式预设表。key 是 setIndicator() 用的标识符，
 * value 是 lightweight-charts LineSeries 配置。
 * 每种指标都有自己的颜色和线型（实线或虚线）。
 */
const INDICATOR_STYLES: Record<string, LineSeriesPartialOptions> = {
  ma7: { color: '#ff9800', lineWidth: 1, priceLineVisible: false, lastValueVisible: true },
  ma25: { color: '#2196f3', lineWidth: 1, priceLineVisible: false, lastValueVisible: true },
  ema9: { color: '#e040fb', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, lineStyle: 2 },
  ema21: { color: '#7c4dff', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, lineStyle: 2 },
  bbUpper: { color: '#4caf50', lineWidth: 1, priceLineVisible: false, lineStyle: 2 },
  bbLower: { color: '#f44336', lineWidth: 1, priceLineVisible: false, lineStyle: 2 },
}

/**
 * K线图 Composable——图表核心逻辑。
 *
 * @param containerRef  Vue 模板引用，指向图表容器 DOM 元素
 * @param onLegend      可选回调，十字光标移动时回调传递图例数据（null 表示光标离开图表区域）
 * @returns             图表控制对象：setData / setIndicator / clearIndicators
 */
export function useChart(containerRef: Ref<HTMLElement | null>, onLegend?: (d: LegendData | null) => void) {
  // 图表实例用 shallowRef——lightweight-charts 对象是 mutable，深度代理会出问题
  const chart = shallowRef<IChartApi | null>(null)
  const candleSeries = shallowRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeries = shallowRef<ISeriesApi<'Histogram'> | null>(null)

  // 指标线注册表：key → LineSeries 实例
  const indicatorLines = new Map<string, ISeriesApi<'Line'>>()

  // MutationObserver：监听 <html> 的 data-theme 属性变化，即时更新图表配色
  let observer: MutationObserver | null = null
  // 内存缓存一份当前 K线数据，十字光标划过时不需要从图表读数据，直接 O(1) 查找
  let candleCache: { time: Time; o: number; h: number; l: number; c: number; v: number }[] = []

  /**
   * 重新读取主题颜色并应用到图表。
   * 被 MutationObserver 同 resize 事件触发。
   */
  function applyTheme() {
    if (!chart.value) return
    const c = readThemeColors()
    chart.value.applyOptions({
      layout: { background: { type: ColorType.Solid, color: c.bg }, textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
    })
  }

  // ====== 生命周期：挂载 ======
  onMounted(() => {
    if (!containerRef.value) return

    // 创建图表实例，尺寸对齐容器元素
    const c = createChart(
      containerRef.value,
      buildChartOptions(containerRef.value.clientWidth, containerRef.value.clientHeight),
    )

    // 添加蜡烛图主序列 + 成交量序列
    const cs = c.addSeries(CandlestickSeries, candleOptions)
    const vs = c.addSeries(HistogramSeries, volumeOptions)
    // 成交量区域只占底部 20%，让 K线图有 80% 的显示空间
    vs.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

    // 十字光标移动 → 计算图例数据并回调
    c.subscribeCrosshairMove((param) => {
      if (!onLegend) return
      // 光标在图表外（param.time === undefined），隐藏图例
      if (!param.time || param.point === undefined) {
        onLegend(null)
        return
      }
      // 在 candleCache 中二分查找（实为 O(n) 线性查找，因为 key 是 time）
      const idx = candleCache.findIndex(d => d.time === param.time)
      if (idx < 0) { onLegend(null); return }

      const d = candleCache[idx]
      // 前一 K线用来算涨跌幅（第一根 K线没有前值，用自身值兜底）
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
        color: d.c >= d.o ? '#00c853' : '#ff1744', // 收盘≥开盘阳线绿色，否则阴线红色
      })
    })

    // 绑定键盘快捷键（设置 tabIndex 让 div 可以接收焦点）
    containerRef.value.addEventListener('keydown', handleKeydown)
    containerRef.value.tabIndex = 0

    chart.value = c
    candleSeries.value = cs
    volumeSeries.value = vs

    // 监听主题变化，用 MutationObserver 捕获 data-theme 属性变更
    observer = new MutationObserver(applyTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    window.addEventListener('resize', handleResize)
  })

  // ====== 生命周期：卸载 ======
  onUnmounted(() => {
    observer?.disconnect()
    window.removeEventListener('resize', handleResize)
    containerRef.value?.removeEventListener('keydown', handleKeydown)
    chart.value?.remove() // lightweight-charts 的 remove 方法释放所有内存
  })

  /**
   * 键盘快捷键处理。
   * R: 重置缩放，回到默认比例
   * +/- (=): 放大/缩小 K线间距（barSpacing ± 2）
   * ← →: 平移可视区域 5 个 bar
   * F: 适配内容（fitContent）
   */
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
        // barSpacing 最小为 2，太小了 K线会挤成一团看不清
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
        ts.fitContent() // 显示全部数据
        e.preventDefault()
        break
    }
  }

  /**
   * 响应窗口 resize。图表尺寸跟随容器变化，自适应布局。
   */
  function handleResize() {
    if (!containerRef.value || !chart.value) return
    chart.value.applyOptions({
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight,
    })
  }

  /**
   * 设置 K线数据——清空旧数据，写入新 OHLCV 数组。
   * lightweight-charts 的 Time 格式是秒级 Unix 时间戳（number），所以要除以 1000。
   * 成交量柱颜色根据涨跌自动染色（阳线半透明绿，阴线半透明红）。
   * 初次加载或数据量 <= 60 条时 fitContent 显示全部；
   * 超过 60 条时只显示最新 60 根（防止数据太多缩成一条线）。
   */
  function setData(data: OHLCV[]) {
    if (!candleSeries.value || !volumeSeries.value || !chart.value) return

    // 转换成 lightweight-charts 需要个格式
    const candleData = data.map(d => ({
      time: (d.timestamp / 1000) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    // 内存缓存一份完整数据（含成交量），给十字光标图例用
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

    // 控制初始可视范围：最多显示 60 根，多了就只看最新 60 根
    const visibleBars = Math.min(60, data.length)
    if (data.length > visibleBars) {
      const from = (data[data.length - visibleBars].timestamp / 1000) as Time
      const to = (data[data.length - 1].timestamp / 1000) as Time
      chart.value.timeScale().setVisibleRange({ from, to })
    } else {
      chart.value.timeScale().fitContent()
    }
  }

  /**
   * 叠加/更新一条指标线。key 决定样式（从 INDICATOR_STYLES 表查），
   * field 回调从每根 OHLCV 中提取目标值（如收盘价、EMA 值等）。
   *
   * 如果同一个 key 已经存在，更新数据（平滑过渡）；否则创建新 LineSeries。
   * NaN / Infinity 的点自动过滤掉，防止图表出现断线或异常显示。
   */
  function setIndicator(key: string, data: OHLCV[], field: (d: OHLCV, i: number) => number) {
    if (!chart.value) return
    const lineData = data
      .map((d, i) => ({
        time: (d.timestamp / 1000) as Time,
        value: field(d, i),
      }))
      .filter(p => Number.isFinite(p.value)) // 过滤 NaN/Infinity

    const existing = indicatorLines.get(key)
    if (existing) {
      existing.setData(lineData) // 更新已有的线
    } else {
      // 从样式表取预设样式，找不到就用默认灰色
      const opts = INDICATOR_STYLES[key] ?? { color: '#888', lineWidth: 1, priceLineVisible: false }
      const series = chart.value.addSeries(LineSeries, opts)
      series.setData(lineData)
      indicatorLines.set(key, series)
    }
  }

  /**
   * 清空全部指标线。一般在切换币对时调用，防止旧指标还残留在图上。
   */
  function clearIndicators() {
    for (const [_key, series] of indicatorLines) {
      chart.value?.removeSeries(series)
    }
    indicatorLines.clear()
  }

  return { chart, candleSeries, volumeSeries, setData, setIndicator, clearIndicators }
}
