/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * RSI 策略（相对强弱指数）。用 Wilder 平滑法算 RSI(14)。
 * RSI 低过 30 就是超卖（该下该买），高过 70 就是超买（该下该卖）。
 * 从 50 分开算：
 * - RSI < 30 → 超卖 +20，RSI 开始回涨再 +5
 * - RSI > 70 → 超买 -20，RSI 开始回落再 -5
 * - RSI 位置：> 50 +5，< 50 -5
 * - RSI 方向：上升 +3，下降 -3
 *
 * Wilder 个算法讲究：前 14 根用简单平均起底，之后再平滑递推。
 * 公式：RS = 平均涨幅/平均跌幅，RSI = 100 - 100/(1+RS)。
 */

import type { StrategyPlugin, AnalysisResult, OHLCV, Rating, Signal } from '@/types'
import { scoreToRating } from '@/utils/indicators'

/**
 * RSI——Welles Wilder 1978 年个标准算法。
 * 前 period 根简单平均起底，之后用 Wilder 平滑递推。
 * @param closes 收盘价序列
 * @param period 周期（通常是 14）
 * @returns      RSI 序列——前 period 位 NaN
 */
function calcRSI(closes: number[], period: number): number[] {
  const rsi: number[] = []
  let gains = 0, losses = 0

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]

    if (i <= period) {
      // 前 period 根：简单累积取平均
      if (change > 0) gains += change
      else losses -= change
      if (i < period) { rsi.push(NaN); continue }
      gains /= period
      losses /= period
    } else {
      // Wilder 平滑：(旧均值×(N-1) + 新值) / N
      const gain = change > 0 ? change : 0
      const loss = change < 0 ? -change : 0
      gains = (gains * (period - 1) + gain) / period
      losses = (losses * (period - 1) + loss) / period
    }

    // RSI = 100 - 100/(1+RS)，losses=0 时全涨，RSI=100
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
    const rsiNow = rsi[last], rsiPrev = rsi[last - 1]

    const signals: Signal[] = []
    let score = 50
    let summaryKey = 'summary.rsi_bearish'
    const valStr = rsiNow.toFixed(1)

    // ① 超卖（< 30）——+20，RSI 回升再 +5
    if (rsiNow < 30) {
      score += 20; summaryKey = 'summary.rsi_oversold'
      signals.push({ type: 'buy', message: `RSI超卖 (${valStr})，可能反弹`, i18nKey: 'signals.rsi_oversold_signal', i18nParams: { val: valStr }, timestamp: data[data.length - 1].timestamp })
      if (rsiNow > rsiPrev) score += 5 // 超卖区回升——背离看涨
    }
    // ② 超买（> 70）—— -20，RSI 回落再 -5
    else if (rsiNow > 70) {
      score -= 20; summaryKey = 'summary.rsi_overbought'
      signals.push({ type: 'sell', message: `RSI超买 (${valStr})，可能回调`, i18nKey: 'signals.rsi_overbought_signal', i18nParams: { val: valStr }, timestamp: data[data.length - 1].timestamp })
      if (rsiNow < rsiPrev) score -= 5
    }
    // ③ 30~70 正常区
    else {
      summaryKey = rsiNow > 50 ? 'summary.rsi_bullish' : 'summary.rsi_bearish'
    }

    // RSI 位置——50 上和下
    if (rsiNow > 50) score += 5
    else score -= 5

    // RSI 方向——走高 +3，走低 -3
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
