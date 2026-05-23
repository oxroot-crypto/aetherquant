import type { StrategyPlugin, AnalysisResult, OHLCV, Rating, Signal } from '@/types'
import { scoreToRating } from '@/utils/indicators'

function calcRSI(closes: number[], period: number): number[] {
  const rsi: number[] = []
  let gains = 0
  let losses = 0

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    if (i <= period) {
      if (change > 0) gains += change
      else losses -= change
      if (i < period) { rsi.push(NaN); continue }
      gains /= period
      losses /= period
    } else {
      const gain = change > 0 ? change : 0
      const loss = change < 0 ? -change : 0
      gains = (gains * (period - 1) + gain) / period
      losses = (losses * (period - 1) + loss) / period
    }

    const rs = losses === 0 ? 100 : gains / losses
    rsi.push(100 - 100 / (1 + rs))
  }

  return rsi
}

export const rsiStrategy: StrategyPlugin = {
  id: 'rsi',
  name: 'RSI',
  version: '1.0.0',
  type: 'strategy',
  description: 'Relative Strength Index (14) — overbought/oversold and divergence detection',

  analyze(data: OHLCV[]): AnalysisResult {
    const closes = data.map(d => d.close)
    const rsi = calcRSI(closes, 14)
    const last = rsi.length - 1
    const rsiNow = rsi[last]
    const rsiPrev = rsi[last - 1]

    const signals: Signal[] = []
    let score = 50
    let summaryKey = 'summary.rsi_bearish'
    const valStr = rsiNow.toFixed(1)

    if (rsiNow < 30) {
      score += 20
      summaryKey = 'summary.rsi_oversold'
      signals.push({
        type: 'buy',
        message: `RSI超卖 (${valStr})，可能反弹`,
        i18nKey: 'signals.rsi_oversold_signal',
        i18nParams: { val: valStr },
        timestamp: data[data.length - 1].timestamp,
      })
      if (rsiNow > rsiPrev) score += 5
    } else if (rsiNow > 70) {
      score -= 20
      summaryKey = 'summary.rsi_overbought'
      signals.push({
        type: 'sell',
        message: `RSI超买 (${valStr})，可能回调`,
        i18nKey: 'signals.rsi_overbought_signal',
        i18nParams: { val: valStr },
        timestamp: data[data.length - 1].timestamp,
      })
      if (rsiNow < rsiPrev) score -= 5
    } else {
      summaryKey = rsiNow > 50 ? 'summary.rsi_bullish' : 'summary.rsi_bearish'
    }

    if (rsiNow > 50) score += 5
    else score -= 5

    if (rsiNow > rsiPrev) score += 3
    else score -= 3

    score = Math.max(0, Math.min(100, score))

    return {
      strategyId: 'rsi',
      strategyName: 'RSI',
      rating: scoreToRating(score),
      score,
      signals,
      indicators: [
        { name: 'RSI(14)', value: rsiNow, displayValue: valStr },
      ],
      summary: rsiNow < 30 ? '超卖区域，潜在买入机会'
        : rsiNow > 70 ? '超买区域，注意回调风险'
        : rsiNow > 50 ? '多头动能'
        : '空头动能',
      summaryKey,
      timestamp: Date.now(),
    }
  },
}
