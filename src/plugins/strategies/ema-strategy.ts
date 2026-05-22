import type { StrategyPlugin, AnalysisResult, OHLCV, Rating, Signal } from '@/types'

function calcEMA(data: number[], period: number): number[] {
  const result: number[] = []
  const k = 2 / (period + 1)
  let prev = data[0]
  result.push(prev)
  for (let i = 1; i < data.length; i++) {
    prev = data[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

function scoreToRating(score: number): Rating {
  if (score >= 70) return 'bullish'
  if (score >= 55) return 'slightly_bullish'
  if (score >= 45) return 'neutral'
  if (score >= 30) return 'slightly_bearish'
  return 'bearish'
}

export const emaStrategy: StrategyPlugin = {
  id: 'ema-mtf',
  name: 'EMA Multi-Timeframe',
  version: '1.0.0',
  type: 'strategy',
  description: 'EMA alignment analysis (9, 21, 50) — multi-timeframe trend confirmation',

  analyze(data: OHLCV[]): AnalysisResult {
    const closes = data.map(d => d.close)
    const ema9 = calcEMA(closes, 9)
    const ema21 = calcEMA(closes, 21)
    const ema50 = calcEMA(closes, 50)
    const last = closes.length - 1
    const price = closes[last]

    const e9 = ema9[last]
    const e21 = ema21[last]
    const e50 = ema50[last]

    const signals: Signal[] = []
    let score = 50
    let summaryKey = 'summary.ema_mixed'

    const bullishAlignment = price > e9 && e9 > e21 && e21 > e50
    const bearishAlignment = price < e9 && e9 < e21 && e21 < e50

    if (bullishAlignment) {
      score += 20
      summaryKey = 'summary.ema_bullish'
      signals.push({
        type: 'buy',
        message: 'EMA多头完美排列 (价格 > EMA9 > EMA21 > EMA50)',
        i18nKey: 'signals.ema_full_bullish',
        timestamp: data[last].timestamp,
      })
    } else if (bearishAlignment) {
      score -= 20
      summaryKey = 'summary.ema_bearish'
      signals.push({
        type: 'sell',
        message: 'EMA空头完美排列 (价格 < EMA9 < EMA21 < EMA50)',
        i18nKey: 'signals.ema_full_bearish',
        timestamp: data[last].timestamp,
      })
    }

    if (price > e9) score += 5; else score -= 5
    if (price > e21) score += 5; else score -= 5
    if (price > e50) score += 5; else score -= 5

    if (e9 > e21) score += 5; else score -= 5
    if (e21 > e50) score += 3; else score -= 3

    const ema9Slope = e9 - ema9[last - 1]
    if (ema9Slope > 0) score += 4
    else score -= 4

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
