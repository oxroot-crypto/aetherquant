/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 布林带策略（波动率分析）。三条线：中轨 SMA(20)，上下轨 ±2 倍标准差。
 * 额外算两只衍生指标：%B 价格在带里个相对位置、Bandwidth 带宽。
 *
 * 评分走 50 起：
 * - 价格破下轨（%B < 0）+15，破上轨（%B > 1）+10
 * - %B > 0.5 偏多 +8，< 0.5 偏空 -8
 * - 带宽在缩（可能要 squeeze） +3 → 带宽 < 5% 触发突破预警
 * - 价格在中轨上头 +5，下底 -5
 */

import type { StrategyPlugin, AnalysisResult, OHLCV, Signal } from '@/types'
import { calcSMA, scoreToRating } from '@/utils/indicators'

interface BollingerResult {
  middle: number
  upper: number
  lower: number
  bandwidth: number   // (upper - lower) / middle，度量波动率宽窄
  percentB: number    // (close - lower) / (upper - lower)，度量价格在带内位置
}

/**
 * 算布林带——五步走：
 * 1. SMA(20) → 中轨
 * 2. 20 窗口标准差
 * 3. 中轨 ± 2σ → 上下轨
 * 4. %B = (close - lower)/(upper - lower)
 * 5. bandwidth = (upper - lower)/middle
 */
function calcBollinger(closes: number[], period: number, stdDev: number): BollingerResult[] {
  const sma = calcSMA(closes, period)
  const results: BollingerResult[] = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || isNaN(sma[i])) {
      results.push({ middle: NaN, upper: NaN, lower: NaN, bandwidth: NaN, percentB: NaN })
      continue
    }

    // 标准差 √(Σ(x-μ)²/N)
    let sumSq = 0
    for (let j = i - period + 1; j <= i; j++) sumSq += (closes[j] - sma[i]) ** 2
    const std = Math.sqrt(sumSq / period)

    const upper = sma[i] + stdDev * std
    const lower = sma[i] - stdDev * std
    const bandwidth = sma[i] !== 0 ? (upper - lower) / sma[i] : 0
    const range = upper - lower
    const percentB = range > 0 ? (closes[i] - lower) / range : 0.5

    results.push({ middle: sma[i], upper, lower, bandwidth, percentB })
  }
  return results
}

export const bollingerStrategy: StrategyPlugin = {
  id: 'bollinger',
  name: 'Bollinger Bands',
  version: '1.0.0',
  type: 'strategy',
  description: 'Bollinger Bands (20, 2) — volatility, squeeze, and price position analysis',

  analyze(data: OHLCV[]): AnalysisResult {
    const closes = data.map(d => d.close)
    // 标准参数：周期 20，标准差倍数 2
    const bb = calcBollinger(closes, 20, 2)

    const last = bb.length - 1
    const curr = bb[last]
    const prev = bb[last - 1]

    const signals: Signal[] = []
    let score = 50
    let summaryKey = 'summary.bb_inside'
    const pctB = (curr.percentB * 100).toFixed(0)
    const price = closes[closes.length - 1]

    // ① 边界触碰：破下轨看反弹 +15，破上轨跟涨 +10
    if (curr.percentB < 0) {
      score += 15; summaryKey = 'summary.bb_oversold'
      signals.push({ type: 'buy', message: '价格触及下轨，可能反弹', i18nKey: 'signals.bb_lower_band', timestamp: data[data.length - 1].timestamp })
    } else if (curr.percentB > 1) {
      score += 10; summaryKey = 'summary.bb_overbought'
      // 破上轨是强势信号——不卖，type 用 info
      signals.push({ type: 'info', message: '价格突破上轨，强势上涨', i18nKey: 'signals.bb_upper_band', timestamp: data[data.length - 1].timestamp })
    }

    // ② %B 相对中轨——> 0.5 就是偏多 +8，< 0.5 偏空 -8
    if (curr.percentB > 0.5) score += 8
    else score -= 8

    // ③ Squeeze：带宽缩小 +3，< 5% 触发突破预警
    if (curr.bandwidth < prev.bandwidth) {
      score += 3
      if (curr.bandwidth < 0.05) {
        signals.push({ type: 'info', message: '布林带挤压：波动率收缩，可能即将突破', i18nKey: 'signals.bb_squeeze', timestamp: data[data.length - 1].timestamp })
      }
    } else {
      score -= 2
    }

    // ④ 价格 vs 中轨——上 +5，下 -5
    if (price > curr.middle) score += 5
    else score -= 5

    score = Math.max(0, Math.min(100, score))

    return {
      strategyId: 'bollinger',
      strategyName: 'Bollinger Bands',
      rating: scoreToRating(score),
      score,
      signals,
      indicators: [
        { name: 'BB Upper', value: curr.upper, displayValue: curr.upper.toFixed(2) },
        { name: 'BB Middle', value: curr.middle, displayValue: curr.middle.toFixed(2) },
        { name: 'BB Lower', value: curr.lower, displayValue: curr.lower.toFixed(2) },
        { name: '%B', value: curr.percentB, displayValue: (curr.percentB * 100).toFixed(1) + '%' },
        { name: 'Bandwidth', value: curr.bandwidth, displayValue: (curr.bandwidth * 100).toFixed(2) + '%' },
      ],
      summary: curr.percentB < 0 ? '超卖，价格低于下轨'
        : curr.percentB > 1 ? '超买，价格高于上轨'
        : `位于布林带内，%B为${pctB}%`,
      summaryKey,
      summaryParams: { pct: pctB },
      timestamp: Date.now(),
    }
  },
}
