import type { StrategyPlugin, AnalysisResult, OHLCV, Rating, Signal } from '@/types'

function calcEMA(data: number[], period: number): number[] {
  const result: number[] = []
  const k = 2 / (period + 1)
  let prevEma = data[0]
  result.push(prevEma)
  for (let i = 1; i < data.length; i++) {
    prevEma = data[i] * k + prevEma * (1 - k)
    result.push(prevEma)
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

export const macdStrategy: StrategyPlugin = {
  id: 'macd',
  name: 'MACD',
  version: '1.0.0',
  type: 'strategy',
  description: 'MACD (12, 26, 9) — trend momentum and signal line crossover detection',

  analyze(data: OHLCV[]): AnalysisResult {
    const closes = data.map(d => d.close)
    const ema12 = calcEMA(closes, 12)
    const ema26 = calcEMA(closes, 26)

    const macdLine = ema12.map((v, i) => v - ema26[i])
    const signal = calcEMA(macdLine, 9)
    const histogram = macdLine.map((v, i) => v - signal[i])

    const last = data.length - 1
    const prev = last - 1
    const macdNow = macdLine[last]
    const sigNow = signal[last]
    const histNow = histogram[last]
    const histPrev = histogram[prev]

    const signals: Signal[] = []
    let score = 50
    let summaryKey = 'summary.macd_neutral'

    if (macdNow > sigNow) {
      score += 10
      summaryKey = 'summary.macd_bullish'
      if (macdLine[prev] <= signal[prev]) {
        signals.push({
          type: 'buy',
          message: 'MACD金叉',
          i18nKey: 'signals.macd_bullish_cross',
          timestamp: data[last].timestamp,
        })
        score += 10
      }
    } else {
      score -= 10
      summaryKey = 'summary.macd_bearish'
      if (macdLine[prev] >= signal[prev]) {
        signals.push({
          type: 'sell',
          message: 'MACD死叉',
          i18nKey: 'signals.macd_bearish_cross',
          timestamp: data[last].timestamp,
        })
        score -= 10
      }
    }

    if (macdNow > 0) score += 8
    else score -= 8

    if (histNow > 0 && histNow > histPrev) score += 7
    else if (histNow > 0 && histNow < histPrev) score -= 3
    else if (histNow < 0 && histNow < histPrev) score -= 7
    else score += 3

    if (histNow > 0 && histPrev <= 0) score += 5
    if (histNow < 0 && histPrev >= 0) score -= 5

    score = Math.max(0, Math.min(100, score))

    return {
      strategyId: 'macd',
      strategyName: 'MACD',
      rating: scoreToRating(score),
      score,
      signals,
      indicators: [
        { name: 'MACD', value: macdNow, displayValue: macdNow.toFixed(4) },
        { name: 'Signal', value: sigNow, displayValue: sigNow.toFixed(4) },
        { name: 'Histogram', value: histNow, displayValue: histNow.toFixed(4) },
      ],
      summary: score >= 55 ? '多头动能，MACD高于信号线'
        : score <= 45 ? '空头动能，MACD低于信号线'
        : 'MACD中性，方向不明',
      summaryKey,
      timestamp: Date.now(),
    }
  },
}
