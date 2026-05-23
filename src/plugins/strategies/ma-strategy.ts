/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 均线交叉策略（MA Crossover）。算 SMA(7) 同 SMA(25)，捉金叉/死叉。
 * 价格在两条均线上头就加分，在下头就扣分，MA7 个斜率朝上走也加分。
 * 满分 100，从 50 起算。
 *
 * 评分门道：
 * 1. SMA7 上穿 SMA25 → 金叉（Golden Cross），买入，+10
 * 2. SMA7 下穿 SMA25 → 死叉（Death Cross），卖出，-10
 * 3. 价格站到 MA7 同 MA25 上边 → 多头排列，+10
 * 4. 价格跌到两条均线下底 → 空头排列，-10
 * 5. MA7 斜率向上 → +5，向下 → -5
 * 最后 clamp 到 0-100，防溢出。
 */

import type { StrategyPlugin, AnalysisResult, OHLCV, Signal } from '@/types'
import { calcSMA, scoreToRating } from '@/utils/indicators'

export const maStrategy: StrategyPlugin = {
  id: 'ma-crossover',
  name: 'MA Crossover',
  version: '1.0.0',
  type: 'strategy',
  description: 'Golden Cross / Death Cross detection using MA7 and MA25 crossovers',

  analyze(data: OHLCV[]): AnalysisResult {
    // 至少 25 根——不够就中性返
    if (data.length < 25) {
      return {
        strategyId: 'ma-crossover', strategyName: 'MA Crossover',
        rating: 'neutral', score: 50, signals: [], indicators: [],
        summary: '数据不足，需要至少25根K线',
        summaryKey: 'summary.ma_neutral', timestamp: Date.now(),
      }
    }

    const closes = data.map(d => d.close)
    const ma7 = calcSMA(closes, 7)
    const ma25 = calcSMA(closes, 25)

    const last = data.length - 1
    const prev = last - 1
    const ma7Now = ma7[last], ma25Now = ma25[last]
    const ma7Prev = ma7[prev], ma25Prev = ma25[prev]

    const signals: Signal[] = []
    let score = 50   // 从 50 起——中性
    let summaryKey = 'summary.ma_neutral'

    // ① MA7 跟 MA25 个位置：金叉/死叉 + 趋势方向
    if (ma7Now > ma25Now) {
      score += 15  // 短在长上方——多头
      summaryKey = 'summary.ma_bullish'
      // 前一根还交叉着，该根穿过去哩 → 金叉
      if (ma7Prev <= ma25Prev) {
        signals.push({ type: 'buy', message: '金叉信号：MA7上穿MA25', i18nKey: 'signals.golden_cross', timestamp: data[last].timestamp })
        score += 10
      }
    } else if (ma7Now < ma25Now) {
      score -= 15  // 短在长下方——空头
      summaryKey = 'summary.ma_bearish'
      if (ma7Prev >= ma25Prev) {
        signals.push({ type: 'sell', message: '死叉信号：MA7下穿MA25', i18nKey: 'signals.death_cross', timestamp: data[last].timestamp })
        score -= 10
      }
    }

    // ② 价格同均线个关系：站稳两条 +10，跌破两条 -10
    const priceAboveMa7 = closes[last] > ma7Now
    const priceAboveMa25 = closes[last] > ma25Now
    if (priceAboveMa7 && priceAboveMa25) score += 10
    else if (!priceAboveMa7 && !priceAboveMa25) score -= 10
    // 夹到中间——不动分

    // ③ MA7 斜率——朝上 +5，朝下 -5
    const slope = ma7Now - ma7Prev
    if (slope > 0) score += 5
    else score -= 5

    // clamp 0-100
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
