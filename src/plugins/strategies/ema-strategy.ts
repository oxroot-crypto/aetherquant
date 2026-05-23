/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * EMA 多周期策略——五支策略里头看趋势最灵个一只。算三根 EMA：
 * EMA9（短线，约两日）、EMA21（中线，约一个月）、EMA50（长线）。
 *
 * 核心信号是"排列"：
 * - 价格 > EMA9 > EMA21 > EMA50 → 完美多头排列 +20（最强看多信号）
 * - 价格 < EMA9 < EMA21 < EMA50 → 完美空头排列 -20
 * - 价格对每条均线各 ±5，三条拢共 ±15
 * - EMA9 斜率朝上 +4，朝下 -4
 * - EMA9 同 EMA21 拢得蛮近（< 0.5%）就预警——怕要交叉哩
 *
 * 为啥排列信号最值钱？全周期共振，短中长三条时间维度拢一致，
 * 该种信号比单一指标可靠得多。
 */

import type { StrategyPlugin, AnalysisResult, OHLCV, Signal } from '@/types'
import { calcEMA, scoreToRating } from '@/utils/indicators'

export const emaStrategy: StrategyPlugin = {
  id: 'ema-mtf',
  name: 'EMA Multi-Timeframe',
  version: '1.0.0',
  type: 'strategy',
  description: 'EMA alignment analysis (9, 21, 50) — multi-timeframe trend confirmation',

  analyze(data: OHLCV[]): AnalysisResult {
    // 起码 2 根——斜率对比要前一根
    if (data.length < 2) {
      return {
        strategyId: 'ema-mtf',
        strategyName: 'EMA Multi-Timeframe',
        rating: 'neutral',
        score: 50,
        signals: [],
        indicators: [],
        summary: '数据不足，需要至少2根K线',
        summaryKey: 'summary.ema_mixed',
        timestamp: Date.now(),
      }
    }

    const closes = data.map(d => d.close)
    const ema9 = calcEMA(closes, 9)
    const ema21 = calcEMA(closes, 21)
    const ema50 = calcEMA(closes, 50)

    const last = closes.length - 1
    const prev = last - 1
    const price = closes[last]

    const e9 = ema9[last], e21 = ema21[last], e50 = ema50[last]

    const signals: Signal[] = []
    let score = 50
    let summaryKey = 'summary.ema_mixed'

    // ① 完美排列——五支策略里头最强个单信号 ±20
    const bullishAlignment = price > e9 && e9 > e21 && e21 > e50
    const bearishAlignment = price < e9 && e9 < e21 && e21 < e50

    if (bullishAlignment) {
      score += 20; summaryKey = 'summary.ema_bullish'
      signals.push({ type: 'buy', message: 'EMA多头完美排列 (价格 > EMA9 > EMA21 > EMA50)', i18nKey: 'signals.ema_full_bullish', timestamp: data[last].timestamp })
    } else if (bearishAlignment) {
      score -= 20; summaryKey = 'summary.ema_bearish'
      signals.push({ type: 'sell', message: 'EMA空头完美排列 (价格 < EMA9 < EMA21 < EMA50)', i18nKey: 'signals.ema_full_bearish', timestamp: data[last].timestamp })
    }

    // ② 价格 vs 每条 EMA——站稳 +5，站不稳 -5
    if (price > e9) score += 5; else score -= 5
    if (price > e21) score += 5; else score -= 5
    if (price > e50) score += 5; else score -= 5

    // ③ EMA 两两排列——短在长上头就加分
    if (e9 > e21) score += 5; else score -= 5
    if (e21 > e50) score += 3; else score -= 3

    // ④ EMA9 斜率——朝上 +4，朝下 -4
    if (e9 - ema9[prev] > 0) score += 4
    else score -= 4

    // ⑤ 收敛预警——EMA9 同 EMA21 拢近 < 0.5% 就快交叉哩
    const distE9E21 = ((e9 - e21) / e21) * 100
    if (Math.abs(distE9E21) < 0.5) {
      signals.push({
        type: 'info',
        message: 'EMA9与EMA21收敛，可能即将交叉',
        i18nKey: 'signals.ema_convergence',
        timestamp: data[last].timestamp,
      })
    }

    score = Math.max(0, Math.min(100, score))

    return {
      strategyId: 'ema-mtf',
      strategyName: 'EMA Multi-Timeframe',
      rating: scoreToRating(score),
      score,
      signals,
      indicators: [
        { name: 'EMA9', value: e9, displayValue: e9.toFixed(2) },
        { name: 'EMA21', value: e21, displayValue: e21.toFixed(2) },
        { name: 'EMA50', value: e50, displayValue: e50.toFixed(2) },
        // 价格相对 EMA9 的偏离百分比——衡量短期超买超卖程度
        { name: 'Price vs EMA9', value: ((price - e9) / e9) * 100, displayValue: (((price - e9) / e9) * 100).toFixed(2) + '%' },
      ],
      summary: bullishAlignment ? '全周期强势多头趋势'
        : bearishAlignment ? '全周期强势空头趋势'
        : 'EMA信号混杂，趋势不明',
      summaryKey,
      timestamp: Date.now(),
    }
  },
}
