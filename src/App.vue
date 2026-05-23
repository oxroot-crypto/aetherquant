<script setup lang="ts">
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

const symbol = ref('')
const interval = ref<CandleInterval>('1h')
const data = ref<OHLCV[]>([])
const dataLoading = ref(false)

const pluginTick = ref(0)
pluginManager.subscribe(() => { pluginTick.value++ })

const sources = computed(() => {
  void pluginTick.value
  return pluginManager.getAllExchanges().map(e => ({
    id: e.id,
    name: e.name,
    description: e.description,
  }))
})

const activeSourceId = computed(() => {
  void pluginTick.value
  return pluginManager.getActiveExchange()?.id ?? null
})

const symbols = computed(() => {
  void pluginTick.value
  return pluginManager.getActiveExchange()?.getSupportedSymbols() ?? []
})

const { locale: i18nLocale } = useI18n()
const { results, loading: analysisLoading, error, overallRating, bullishCount, bearishCount, run } = useAnalysis()

function handleRealtimeCandle(candle: OHLCV) {
  const arr = [...data.value]
  const idx = arr.findIndex(d => d.timestamp === candle.timestamp)
  if (idx >= 0) {
    arr[idx] = candle
  } else if (arr.length === 0 || candle.timestamp > arr[arr.length - 1].timestamp) {
    arr.push(candle)
  } else {
    return
  }
  data.value = arr

  nextTick().then(() => plotIndicators())

  const slice = arr.length > 200 ? arr.slice(-200) : arr
  run(slice)
}

const chartRef = ref<InstanceType<typeof KlineChart> | null>(null)

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

function plotIndicators() {
  const d = data.value
  if (d.length === 0 || !chartRef.value) return
  chartRef.value.clearIndicators()

  const ma7 = calcSMA(d, 7)
  const ma25 = calcSMA(d, 25)

  chartRef.value.setIndicator('ma7', d, (_d, i) => ma7[i])
  chartRef.value.setIndicator('ma25', d, (_d, i) => ma25[i])
}

const { connected: liveConnected, lastMsg, start: wsStart } = useRealtime(handleRealtimeCandle)

onMounted(async () => {
  pluginManager.registerExchange(hyperliquidSource)
  pluginManager.registerStrategy(maStrategy)
  pluginManager.registerStrategy(macdStrategy)
  pluginManager.registerStrategy(rsiStrategy)
  pluginManager.registerStrategy(bollingerStrategy)
  pluginManager.registerStrategy(emaStrategy)

  // Wait for full coin list from Hyperliquid meta API
  await fetchMetaCoins()
  pluginTick.value++

  symbol.value = symbols.value[0] ?? ''
  fetchData()
})

async function fetchData() {
  if (!symbol.value) return
  dataLoading.value = true
  try {
    const result = await pluginManager.fetchData(symbol.value, interval.value, 200)
    data.value = result
    await run(result)
    await nextTick()
    plotIndicators()
    wsStart(symbol.value, interval.value)
  } catch (e) {
    console.error('Failed to fetch data:', e)
  } finally {
    dataLoading.value = false
  }
}

function handleSymbolChange(s: string) { symbol.value = s; fetchData() }
function handleIntervalChange(iv: CandleInterval) { interval.value = iv; fetchData() }

function handleSourceChange(sourceId: string) {
  pluginManager.setActiveExchange(sourceId)
  const s = pluginManager.getActiveExchange()?.getSupportedSymbols() ?? []
  symbol.value = s[0] ?? ''
  fetchData()
}

function handleLangChange(lang: string) {
  if (lang !== i18nLocale.value) {
    i18nLocale.value = lang
    localStorage.setItem('aetherquant-lang', lang)
    fetchData()
  }
}
</script>

<template>
  <div class="app-layout">
    <TitleBar @update:lang="handleLangChange" />
    <Toolbar
      :symbols="symbols"
      :exchanges="sources"
      :activeExchangeId="activeSourceId"
      @update:symbol="handleSymbolChange"
      @update:interval="handleIntervalChange"
      @update:exchange="handleSourceChange"
      @refresh="fetchData()"
    >
      <template #extra>
        <span class="ws-indicator" :class="{ live: liveConnected }" :title="lastMsg">
          <span class="ws-dot"></span>
          {{ liveConnected ? 'Live ' + lastMsg : 'Offline' }}
        </span>
      </template>
    </Toolbar>
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
  min-height: 0;
}
.panel-sidebar {
  width: 360px;
  min-width: 320px;
  flex-shrink: 0;
}
.ws-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}
.ws-indicator.live {
  color: #00c853;
}
.ws-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff1744;
  flex-shrink: 0;
}
.ws-indicator.live .ws-dot {
  background: #00c853;
  box-shadow: 0 0 4px #00c853;
}
</style>
