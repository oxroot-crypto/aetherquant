/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * MACD 策略（趋势动能）。拢共三步算：
 * 1. EMA(12) - EMA(26) = MACD 线（快线减慢线个差值）
 * 2. EMA(9, MACD线) = Signal 信号线
 * 3. MACD 线 - Signal 线 = Histogram 柱状图
 *
 * 评分从 50 起步，跟以下门道加减：
 * - MACD 在 Signal 上头 +10，下底 -10
 * - 刚金叉 +10，刚死叉 -10
 * - MACD 在零轴以上 +8，以下 -8
 * - 柱状图放大缩小 ±7 ±3（分正向负向两种情形）
 * - 柱状图穿零轴 ±5（多空翻转个临界点）
 * 最后 clamp 到 0-100。
 */

import type { StrategyPlugin, AnalysisResult, OHLCV, Signal } from '@/types'
import { calcEMA, scoreToRating } from '@/utils/indicators'

export const macdStrategy: StrategyPlugin = {
  id: 'macd',
  name: 'MACD',
  version: '1.0.0',
  type: 'strategy',
  description: 'MACD (12, 26, 9) — trend momentum and signal line crossover detection',

  analyze(data: OHLCV[]): AnalysisResult {
    const closes = data.map(d => d.close)

    // EMA12 - EMA26 = MACD 线
    const ema12 = calcEMA(closes, 12)
    const ema26 = calcEMA(closes, 26)
    const macdLine = ema12.map((v, i) => v - ema26[i])

    // EMA9(MACD) = Signal 线
    const signal = calcEMA(macdLine, 9)

    // MACD - Signal = Histogram——正值多头，负值空头
    const histogram = macdLine.map((v, i) => v - signal[i])

    const last = data.length - 1, prev = last - 1
    const macdNow = macdLine[last], sigNow = signal[last]
    const histNow = histogram[last], histPrev = histogram[prev]

    const signals: Signal[] = []
    let score = 50
    let summaryKey = 'summary.macd_neutral'

    // ① MACD vs Signal 位置 + 交叉
    if (macdNow > sigNow) {
      score += 10; summaryKey = 'summary.macd_bullish'
      if (macdLine[prev] <= signal[prev]) {        // 金叉
        signals.push({ type: 'buy', message: 'MACD金叉', i18nKey: 'signals.macd_bullish_cross', timestamp: data[last].timestamp })
        score += 10
      }
    } else {
      score -= 10; summaryKey = 'summary.macd_bearish'
      if (macdLine[prev] >= signal[prev]) {        // 死叉
        signals.push({ type: 'sell', message: 'MACD死叉', i18nKey: 'signals.macd_bearish_cross', timestamp: data[last].timestamp })
        score -= 10
      }
    }

    // ② 零轴位置——上方多头区，下方空头区
    if (macdNow > 0) score += 8
    else score -= 8

    // ③ Histogram 变化——涨就是动能加，跌就是动能减
    if (histNow > 0 && histNow > histPrev) score += 7        // 正柱放大：多头加速
    else if (histNow > 0 && histNow < histPrev) score -= 3   // 正柱缩小：多头减速（轻扣）
    else if (histNow < 0 && histNow < histPrev) score -= 7   // 负柱放大：空头加速
    else if (histNow < 0 && histNow > histPrev) score += 3   // 负柱缩小：空头减速（轻加）

    // ④ 零轴穿越——比 MACD/Signal 金叉死叉更灵个拐点
    if (histNow > 0 && histPrev <= 0) score += 5   // 负翻正：空转多
    if (histNow < 0 && histPrev >= 0) score -= 5   // 正翻负：多转空

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
