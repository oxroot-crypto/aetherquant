<script setup lang="ts">
/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 量化分析面板——右侧 360px 个侧栏。顶头是综合评级徽章 + 多空票数，
 * 下底是各策略结果卡片。点卡片展开看详细信号同指标值。
 *
 * 评分条颜色渐变：hue = (score / 100) × 120，
 * 0 分红、50 分黄、100 分绿——一睇就晓得强弱。
 * 信号同摘要优先走 i18n 翻译，找不到 key 就 fallback 到直显文本。
 */

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalysisResult, Rating } from '@/types'
import RatingBadge from '@/components/RatingBadge.vue'

const { t, te } = useI18n()

defineProps<{
  results: AnalysisResult[]                             // 分析结果列表
  loading: boolean                                       // 是否正在分析
  error: string | null                                   // 错误信息
  overallRating: { rating: Rating; score: number }     // 综合评级
  bullishCount: number                                   // 看多票数
  bearishCount: number                                   // 看空票数
}>()

// 当前展开个策略卡片 ID（同一时间只展开一个）
const expandedId = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

/**
 * 评分条样式：渐变色从红(H=0)到绿(H=120)。
 * hue = (score / 100) × 120 → 0 分红色，50 分黄色，100 分绿色。
 */
function ratingBarStyle(score: number) {
  const hue = (score / 100) * 120
  return { width: score + '%', backgroundColor: `hsl(${hue}, 70%, 48%)` }
}

/**
 * 取信号消息文本。优先用 i18n 翻译，fallback 到原始 message。
 */
function signalMsg(signal: { i18nKey?: string; i18nParams?: Record<string, string>; message: string }): string {
  if (signal.i18nKey && te(signal.i18nKey)) {
    return t(signal.i18nKey, signal.i18nParams ?? {})
  }
  return signal.message
}

/**
 * 取分析摘要文本。同样优先 i18n 翻译，fallback 到 summary。
 */
function resultSummary(result: AnalysisResult): string {
  if (result.summaryKey && te(result.summaryKey)) {
    return t(result.summaryKey, result.summaryParams ?? {})
  }
  return result.summary
}
</script>

<template>
  <div class="analysis-panel">
    <!-- 面板标题栏：综合评级 + 多空票数 -->
    <div class="panel-header">
      <h3>{{ t('analysis.title') }}</h3>
      <div class="overall" v-if="results.length > 0">
        <span class="overall-label">{{ t('analysis.consensus') }}</span>
        <RatingBadge :rating="overallRating.rating" :score="overallRating.score" />
        <span class="vote-count">
          {{ bullishCount }}B / {{ bearishCount }}S
        </span>
      </div>
    </div>

    <!-- 三种状态：加载中 / 错误 / 空 -->
    <div v-if="loading" class="panel-loading">{{ t('analysis.running') }}</div>
    <div v-else-if="error" class="panel-error">{{ error }}</div>
    <div v-else-if="results.length === 0" class="panel-empty">
      {{ t('analysis.empty') }}
    </div>

    <!-- 结果卡片列表 -->
    <div v-else class="results-list">
      <div
        v-for="result in results"
        :key="result.strategyId"
        class="result-card"
        :class="{ expanded: expandedId === result.strategyId }"
      >
        <!-- 卡片主行：可点击展开 -->
        <div class="card-main" @click="toggleExpand(result.strategyId)">
          <div class="card-left">
            <span class="card-name">{{ result.strategyName }}</span>
            <span class="card-summary">{{ resultSummary(result) }}</span>
          </div>
          <div class="card-right">
            <!-- 评分条（背景+渐变填充） -->
            <div class="score-bar-bg">
              <div class="score-bar-fill" :style="ratingBarStyle(result.score)"></div>
            </div>
            <RatingBadge :rating="result.rating" :score="result.score" />
            <span class="expand-icon">{{ expandedId === result.strategyId ? '▴' : '▾' }}</span>
          </div>
        </div>

        <!-- 展开区域：信号列表 + 指标值 -->
        <div v-if="expandedId === result.strategyId" class="card-details">
          <!-- 交易信号 -->
          <div class="detail-section" v-if="result.signals.length > 0">
            <h4>{{ t('analysis.signals') }}</h4>
            <div
              v-for="(signal, idx) in result.signals"
              :key="idx"
              class="signal-item"
              :class="'signal-' + signal.type"
            >
              <span class="signal-dot"></span>
              <span class="signal-msg">{{ signalMsg(signal) }}</span>
            </div>
          </div>

          <!-- 技术指标值 Grid -->
          <div class="detail-section" v-if="result.indicators.length > 0">
            <h4>{{ t('analysis.indicators') }}</h4>
            <div class="indicator-grid">
              <div
                v-for="indicator in result.indicators"
                :key="indicator.name"
                class="indicator-item"
              >
                <span class="indicator-name">{{ indicator.name }}</span>
                <span class="indicator-value">{{ indicator.displayValue }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analysis-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-primary);
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-primary);
  flex-wrap: wrap;
  gap: 8px;
}
.panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.overall { display: flex; align-items: center; gap: 8px; }
.overall-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
.vote-count { font-size: 12px; color: var(--text-secondary); }

.panel-loading, .panel-error, .panel-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
.panel-error { color: var(--signal-sell-text); }

.results-list { flex: 1; overflow-y: auto; padding: 8px; }

.result-card {
  background: var(--bg-card);
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: background 0.15s;
}
.result-card:hover { background: var(--bg-card-hover); }

.card-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
  gap: 8px;
}
.card-left { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.card-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.card-summary {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.score-bar-bg {
  width: 50px;
  height: 4px;
  background: var(--score-bar-bg);
  border-radius: 2px;
  overflow: hidden;
}
.score-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s; /* 宽度动画：分析完成后评分条平滑拉伸 */
}

.expand-icon { font-size: 10px; color: var(--text-secondary); }

.card-details { padding: 0 12px 12px; border-top: 1px solid var(--border-primary); }
.detail-section { margin-top: 10px; }
.detail-section h4 {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.signal-item { display: flex; align-items: center; gap: 6px; padding: 4px 0; font-size: 12px; }
.signal-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.signal-buy .signal-dot  { background: var(--signal-buy); }
.signal-sell .signal-dot { background: var(--signal-sell); }
.signal-info .signal-dot { background: var(--signal-info); }
.signal-buy .signal-msg  { color: var(--signal-buy-text); }
.signal-sell .signal-msg { color: var(--signal-sell-text); }
.signal-info .signal-msg { color: var(--signal-info-text); }

.indicator-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}
.indicator-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
  border-bottom: 1px solid var(--border-primary);
}
.indicator-name { color: var(--text-secondary); }
.indicator-value { color: var(--text-primary); font-weight: 600; font-variant-numeric: tabular-nums; }
</style>
