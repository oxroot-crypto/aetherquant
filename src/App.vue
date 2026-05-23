<script setup lang="ts">
/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 根组件（App.vue）——拢个应用个"大脑"。渠管事蛮多：
 * - 注冊 Hyperliquid 交易行同五支策略插件
 * - 拉币种列表、管到交易对/周期选择
 * - 调数据、开 WebSocket、画图、跑分析
 * - 语言切换 + localStorage 存到
 *
 * 数据流个来去：
 * 1. onMounted → 注冊插件 → fetchMetaCoins 等币种 → 默认选头一只 → fetchData
 * 2. 用户换币/周期 → fetchData（同一个函数，参数不同）
 * 3. fetchData 做一揽子事：拉 200 根历史 K线 → 图表渲染 → 跑五支策略 → 画指标 → 开 WS
 * 4. WS 推数据过来 → handleRealtimeCandle 合并到 data 数组 → 截最后 200 根重分析 → 刷新指标
 */

import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { pluginManager } from '@/plugin-system/PluginManager'
import { hyperliquidSource, fetchMetaCoins } from '@/plugins/exchanges/hyperliquid'
import { maStrategy, macdStrategy, rsiStrategy, bollingerStrategy, emaStrategy } from '@/plugins/strategies'
import { useAnalysis } from '@/composables/useAnalysis'
import { useRealtime } from '@/composables/useRealtime'
import TitleBar from '@/components/TitleBar.vue'
import Toolbar from '@/components/Toolbar.vue'
import KlineChart from '@/components/KlineChart.vue'
import AnalysisPanel from '@/components/AnalysisPanel.vue'
import type { OHLCV, CandleInterval } from '@/types'

// ====== 核心状态 ======

/** 当前选中个交易对（如 "BTC/USDT"） */
const symbol = ref('')
/** 当前选中个 K线周期 */
const interval = ref<CandleInterval>('1h')
/** K线历史数据数组（最多保留 200 根），按时间升序排列 */
const data = ref<OHLCV[]>([])
/** 数据加载中标志（控制图表的 loading spinner） */
const dataLoading = ref(false)

/**
 * PluginManager 变化计数器。
 * 因为 PluginManager 不是 Vue 响应式，我们需要一个"脏标记"
 * 来触发 computed 重新计算。每次 PluginManager 通知变化就 +1，
 * 所有依赖 sources/symbols/activeSourceId 的 computed 因为引用了 pluginTick
 * 而自动重新取值。
 */
const pluginTick = ref(0)
pluginManager.subscribe(() => { pluginTick.value++ })

// ====== 从 PluginManager 拆出响应式数据 ======

/** 转换为 Toolbar 需要个 {id, name, description} 格式 */
const sources = computed(() => {
  void pluginTick.value // 显式依赖，pluginTick 变就重算
  return pluginManager.getAllExchanges().map(e => ({
    id: e.id,
    name: e.name,
    description: e.description,
  }))
})

/** 当前激活个交易行 ID */
const activeSourceId = computed(() => {
  void pluginTick.value
  return pluginManager.getActiveExchange()?.id ?? null
})

/** 当前交易行支持个交易对列表 */
const symbols = computed(() => {
  void pluginTick.value
  return pluginManager.getActiveExchange()?.getSupportedSymbols() ?? []
})

// ====== Composable ======

const { locale: i18nLocale } = useI18n()

// 分析流水线：拿到 K线数据就调 run 重跑分析
const { results, loading: analysisLoading, error, overallRating, bullishCount, bearishCount, run } = useAnalysis()

/**
 * 实时 K线数据推送回调。
 *
 * 逻辑：收到一根新 K线之后：
 * - 如果同 timestamp 的旧数据存在，原地更新（WebSocket 推送的 candle 每秒更新一次 open/high/low/close）
 * - 如果是全新个 K线（时间 > 最后一条），追加到数组末尾
 * - 其他情况忽略（旧数据或者乱序消息）
 * - 更新 data ref 触发图表重渲染
 * - nextTick 等到 DOM 渲染完再画指标线
 * - 截最后 200 根做分析（分析不需要全量数据，200 根足够）
 */
function handleRealtimeCandle(candle: OHLCV) {
  const arr = [...data.value]      // 展开旧数组，保证响应式更新（data.value = arr）
  const idx = arr.findIndex(d => d.timestamp === candle.timestamp)

  if (idx >= 0) {
    arr[idx] = candle               // 原地更新（当前 K线还在走动）
  } else if (arr.length === 0 || candle.timestamp > arr[arr.length - 1].timestamp) {
    arr.push(candle)                // 新 K线追加
  } else {
    return                          // 乱序/旧数据，丢弃
  }
  data.value = arr

  // 图表指标在 DOM 更新后重新绘制
  nextTick().then(() => plotIndicators())

  // 只给最后 200 根数据做分析，历史太长浪费计算且参考价值降低
  const slice = arr.length > 200 ? arr.slice(-200) : arr
  run(slice)
}

// 图表组件引用，用于调用 setIndicator/clearIndicators
const chartRef = ref<InstanceType<typeof KlineChart> | null>(null)

/**
 * 本地 SMA 计算（App.vue 私有的简化版本）。
 * 跟 indicators.ts 里的 calcSMA 功能一样，但在这里直接算避免导入依赖。
 * 只用于绘图——策略分析用的是 indicators.ts 里的完整实现。
 */
function calcSMA(data: OHLCV[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close
    result.push(sum / period)
  }
  return result
}

/**
 * 在图表上叠加 MA7 和 MA25 指标线。
 * 先清掉旧指标（切换币种时止损旧线残留），再画新的。
 */
function plotIndicators() {
  const d = data.value
  if (d.length === 0 || !chartRef.value) return
  chartRef.value.clearIndicators()

  const ma7 = calcSMA(d, 7)
  const ma25 = calcSMA(d, 25)

  // key 对应 INDICATOR_STYLES 表里的预设样式
  chartRef.value.setIndicator('ma7', d, (_d, i) => ma7[i])
  chartRef.value.setIndicator('ma25', d, (_d, i) => ma25[i])
}

// WebSocket 实时订阅状态
const { connected: liveConnected, lastMsg, start: wsStart } = useRealtime(handleRealtimeCandle)

// ====== 生命周期：启动 ======

onMounted(async () => {
  // 注册全部插件
  pluginManager.registerExchange(hyperliquidSource)
  pluginManager.registerStrategy(maStrategy)
  pluginManager.registerStrategy(macdStrategy)
  pluginManager.registerStrategy(rsiStrategy)
  pluginManager.registerStrategy(bollingerStrategy)
  pluginManager.registerStrategy(emaStrategy)

  // 等币种列表从 API 拉回来后再选第一个（避免用降级列表）
  await fetchMetaCoins()
  pluginTick.value++ // 通知 computed 刷新

  // 默认选第一个交易对
  symbol.value = symbols.value[0] ?? ''
  fetchData()
})

// ====== 数据获取 ======

/**
 * 拉取 K线数据 → 渲染图表 → 跑分析 → 画指标 → 开启 WebSocket 实时订阅。
 * 该函数是数据流核心枢纽。切换币对、切换周期、手动刷新都会调。
 */
async function fetchData() {
  if (!symbol.value) return
  dataLoading.value = true
  try {
    // 拉取最近 200 根 K线
    const result = await pluginManager.fetchData(symbol.value, interval.value, 200)
    data.value = result
    await run(result)           // 先跑分析，得到 AnalysisResult[] 列表
    await nextTick()            // 等 Vue 渲染完分析面板
    plotIndicators()            // 再画图表指标线
    wsStart(symbol.value, interval.value) // 开启 WebSocket 实时流
  } catch (e) {
    console.error('Failed to fetch data:', e)
  } finally {
    dataLoading.value = false
  }
}

// ====== 事件处理 ======

/** 切换交易对 */
function handleSymbolChange(s: string) { symbol.value = s; fetchData() }
/** 切换 K线周期 */
function handleIntervalChange(iv: CandleInterval) { interval.value = iv; fetchData() }

/**
 * 切换交易行。换交易行后需要重新获取币种列表同数据。
 * 因为不同交易行支持个币种不同，符号列表可能完全不一样。
 */
function handleSourceChange(sourceId: string) {
  pluginManager.setActiveExchange(sourceId)
  const s = pluginManager.getActiveExchange()?.getSupportedSymbols() ?? []
  symbol.value = s[0] ?? ''
  fetchData()
}

/**
 * 语言切换。更新 i18n locale 并持久化到 localStorage。
 * 换语言后重新拉取数据——因为分析摘要和信号消息会根据新语言重新生成。
 */
function handleLangChange(lang: string) {
  if (lang !== i18nLocale.value) {
    i18nLocale.value = lang
    localStorage.setItem('aetherquant-lang', lang)
    fetchData() // 重新拉数据触发策略用新语言产出 summary/信号
  }
}
</script>

<template>
  <div class="app-layout">
    <!-- 自定义标题栏：frameless 窗口 chrome -->
    <TitleBar @update:lang="handleLangChange" />

    <!-- 工具栏：交易行/币种/周期选择 + 刷新按钮 + WebSocket 状态指示灯 -->
    <Toolbar
      :symbols="symbols"
      :exchanges="sources"
      :activeExchangeId="activeSourceId"
      @update:symbol="handleSymbolChange"
      @update:interval="handleIntervalChange"
      @update:exchange="handleSourceChange"
      @refresh="fetchData()"
    >
      <!-- WebSocket 连接状态指示器（自定义插槽插入工具栏中间区域） -->
      <template #extra>
        <span class="ws-indicator" :class="{ live: liveConnected }" :title="lastMsg">
          <span class="ws-dot"></span>
          {{ liveConnected ? 'Live ' + lastMsg : 'Offline' }}
        </span>
      </template>
    </Toolbar>

    <!-- 主内容区：左边 K线图 + 右边分析面板 -->
    <div class="app-main">
      <KlineChart ref="chartRef" :data="data" :loading="dataLoading" />
      <div class="panel-sidebar">
        <AnalysisPanel
          :results="results"
          :loading="analysisLoading"
          :error="error"
          :overallRating="overallRating"
          :bullishCount="bullishCount"
          :bearishCount="bearishCount"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}
.app-main {
  display: flex;
  flex: 1;
  min-height: 0; /* flex 子元素 min-height=0 防止内容溢出 */
}
.panel-sidebar {
  width: 360px;
  min-width: 320px;   /* 分析面板最小宽度，防止拖太小看不清 */
  flex-shrink: 0;       /* 窗口缩小时图优先收缩，面板保持宽度 */
}

/* WebSocket 状态指示灯 */
.ws-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}
.ws-indicator.live {
  color: #00c853; /* 连上后文字变绿 */
}
.ws-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff1744;                 /* 断线红灯 */
  flex-shrink: 0;
}
.ws-indicator.live .ws-dot {
  background: #00c853;                 /* 在线绿灯 + 光晕 */
  box-shadow: 0 0 4px #00c853;
}
</style>
