import type { StrategyPlugin, AnalysisResult, OHLCV, Rating, Signal } from '@/types'

function calcSMA(data: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += data[j]
      result.push(sum / period)
    }
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

export const maStrategy: StrategyPlugin = {
  id: 'ma-crossover',
  name: 'MA Crossover',
  version: '1.0.0',
  type: 'strategy',
  description: 'Golden Cross / Death Cross detection using MA7 and MA25 crossovers',

  analyze(data: OHLCV[]): AnalysisResult {
    const closes = data.map(d => d.close)
    const ma7 = calcSMA(closes, 7)
    const ma25 = calcSMA(closes, 25)
    const last = data.length - 1
    const prev = last - 1

    const ma7Now = ma7[last]
    const ma25Now = ma25[last]
    const ma7Prev = ma7[prev]
    const ma25Prev = ma25[prev]

    const signals: Signal[] = []
    let score = 50
    let summaryKey = 'summary.ma_neutral'

    if (ma7Now > ma25Now) {
      score += 15
      summaryKey = 'summary.ma_bullish'
      if (ma7Prev <= ma25Prev) {
        signals.push({
          type: 'buy',
          message: '金叉信号：MA7上穿MA25',
          i18nKey: 'signals.golden_cross',
          timestamp: data[last].timestamp,
        })
        score += 10
      }
    } else if (ma7Now < ma25Now) {
      score -= 15
      summaryKey = 'summary.ma_bearish'
      if (ma7Prev >= ma25Prev) {
        signals.push({
          type: 'sell',
          message: '死叉信号：MA7下穿MA25',
          i18nKey: 'signals.death_cross',
          timestamp: data[last].timestamp,
        })
        score -= 10
      }
    }

    const priceAboveMa7 = closes[last] > ma7Now
    const priceAboveMa25 = closes[last] > ma25Now
    if (priceAboveMa7 && priceAboveMa25) score += 10
    else if (!priceAboveMa7 && !priceAboveMa25) score -= 10

    const slope = ma7Now - ma7[prev]
    if (slope > 0) score += 5
    else score -= 5

    score = Math.max(0, Math.min(100, score))

    return {
      strategyId: 'ma-crossover',
      strategyName: 'MA Crossover',
      rating: scoreToRating(score),
      score,
      signals,
      indicators: [
        { name: 'MA7', value: ma7Now, displayValue: ma7Now.toFixed(2) },
        { name: 'MA25', value: ma25Now, displayValue: ma25Now.toFixed(2) },
      ],
      summary: score >= 55 ? '上升趋势，均线多头排列'
        : score <= 45 ? '下降趋势，均线空头排列'
        : '横盘震荡，均线收敛',
      summaryKey,
      timestamp: Date.now(),
    }
  },
}
