<script setup lang="ts">
/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * K线图组件——纯展示层，逻辑拢在 useChart composable 里头。
 * 显示蜡烛图 + 成交量柱，加载中出 spinner 遮罩，
 * 鼠标划到 K线上头出 O/H/L/C/V 图例浮层加涨跌幅。
 * defineExpose 暴露 setIndicator/clearIndicators 给父组件，
 * 等渠调用来画/清除 MA/EMA 等指标线。
 * 右下角半透明快捷键提示：R 重置 / +/- 缩放 / ←→ 平移 / F 适应。
 */

import { ref, watch } from 'vue'
import { useChart, type LegendData } from '@/composables/useChart'
import type { OHLCV } from '@/types'

const props = defineProps<{
  data: OHLCV[]         // K线数据
  loading: boolean      // 是否正在加载
}>()

// 图表容器 DOM 引用
const chartContainer = ref<HTMLElement | null>(null)
// 十字光标图例数据（null = 光标不在图表区域）
const legend = ref<LegendData | null>(null)

// 解构 useChart，传入图例回调
const { setData, fitView, setIndicator, setOscillator, clearIndicators } = useChart(chartContainer, (d) => { legend.value = d })

// 监听 data 变化：有数据就渲染图表
watch(
  () => props.data,
  (data) => {
    if (data.length > 0) setData(data)
  },
  { immediate: true },
)

// 暴露指标接口给父组件（App.vue 调用 setIndicator/clearIndicators 画 MA 线）
defineExpose({ setIndicator, setOscillator, clearIndicators, fitView })
</script>

<template>
  <div class="kline-chart-wrapper">
    <!-- 加载中遮罩 -->
    <div v-if="loading" class="chart-overlay">
      <div class="spinner"></div>
    </div>

    <!-- 十字光标图例浮层 -->
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

    <!-- 快捷键提示 -->
    <div class="chart-hints">
      <span>R 重置</span>
      <span>+/- 缩放</span>
      <span>←→ 平移</span>
      <span>F 适应</span>
    </div>

    <!-- 指标图例标注 -->
    <div class="indicator-legend">
      <div class="ind-label"><span class="ind-dot" style="background:#ff9800"></span>MA7</div>
      <div class="ind-label"><span class="ind-dot" style="background:#2196f3"></span>MA25</div>
      <div class="ind-label"><span class="ind-dot" style="background:#4caf50;border:1px dashed #4caf50"></span>BB上</div>
      <div class="ind-label"><span class="ind-dot" style="background:#ffeb3b"></span>BB中</div>
      <div class="ind-label"><span class="ind-dot" style="background:#f44336;border:1px dashed #f44336"></span>BB下</div>
      <div class="ind-label ind-rsi"><span class="ind-dot" style="background:#00e5ff"></span>RSI</div>
    </div>

    <!-- 图表容器（lightweight-charts 挂载到这里） -->
    <div ref="chartContainer" class="chart-container" tabindex="0"></div>
  </div>
</template>

<style scoped>
.kline-chart-wrapper { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.chart-container { width: 100%; height: 100%; outline: none; }

.chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  z-index: 10;
}

/* 旋转加载动画 */
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--score-bar-bg);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.chart-legend {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 5;
  background: var(--bg-card);
  border-left: 3px solid; /* 左边框颜色 = 涨跌色 */
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-variant-numeric: tabular-nums; /* 等宽数字防止宽度跳动 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: none; /* 不挡鼠标事件，透传给底层图表 */
}
.legend-row { display: flex; align-items: center; gap: 4px; }
.legend-label { color: var(--text-muted); font-weight: 600; margin-left: 6px; }
.legend-label:first-child { margin-left: 0; }
.legend-meta { margin-top: 2px; font-size: 11px; color: var(--text-secondary); gap: 8px; }

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

/* 指标图例标注——右上角，半透明背景，不挡鼠标 */
.indicator-legend {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 10px;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 4px;
  padding: 4px 8px;
  pointer-events: none;
}
.ind-label {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.ind-label.ind-rsi { opacity: 0.7; } /* RSI 在独立窗格里，稍微虚化 */
.ind-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
</style>
