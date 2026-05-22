<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChart, type LegendData } from '@/composables/useChart'
import type { OHLCV } from '@/types'

const props = defineProps<{
  data: OHLCV[]
  loading: boolean
}>()

const chartContainer = ref<HTMLElement | null>(null)
const legend = ref<LegendData | null>(null)

const { setData, setIndicator, clearIndicators } = useChart(chartContainer, (d) => { legend.value = d })

watch(
  () => props.data,
  (data) => {
    if (data.length > 0) setData(data)
  },
  { immediate: true }
)

defineExpose({ setIndicator, clearIndicators })
</script>

<template>
  <div class="kline-chart-wrapper">
    <div v-if="loading" class="chart-overlay">
      <div class="spinner"></div>
    </div>

    <div v-if="legend" class="chart-legend" :style="{ borderColor: legend.color }">
      <div class="legend-row">
        <span class="legend-label">O</span><span>{{ legend.open }}</span>
        <span class="legend-label">H</span><span>{{ legend.high }}</span>
        <span class="legend-label">L</span><span>{{ legend.low }}</span>
        <span class="legend-label">C</span><span :style="{ color: legend.color }">{{ legend.close }}</span>
      </div>
      <div class="legend-row legend-meta">
        <span>{{ legend.time }}</span>
        <span>{{ legend.percent }}</span>
        <span>V: {{ legend.volume }}</span>
      </div>
    </div>

    <div class="chart-hints">
      <span>R 重置</span>
      <span>+/- 缩放</span>
      <span>←→ 平移</span>
      <span>F 适应</span>
    </div>

    <div ref="chartContainer" class="chart-container" tabindex="0"></div>
  </div>
</template>

<style scoped>
.kline-chart-wrapper {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.chart-container {
  width: 100%;
  height: 100%;
  outline: none;
}
.chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  z-index: 10;
}
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--score-bar-bg);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.chart-legend {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 5;
  background: var(--bg-card);
  border-left: 3px solid;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-label {
  color: var(--text-muted);
  font-weight: 600;
  margin-left: 6px;
}
.legend-label:first-child { margin-left: 0; }
.legend-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-secondary);
  gap: 8px;
}
.chart-hints {
  position: absolute;
  bottom: 8px;
  right: 12px;
  z-index: 5;
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: var(--text-muted);
  opacity: 0.5;
  pointer-events: none;
}
</style>
