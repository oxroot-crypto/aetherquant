/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 技术指标工具函数——全平台五支策略拢在用渠。拢共三只函数：
 * calcSMA 简单移动平均、calcEMA 指数移动平均、scoreToRating
 * 评分转五档评级。三只拢是纯函数，冇副作用，放到哪里都调得。
 */

import type { Rating } from '@/types'

/**
 * 指数移动平均（EMA）——MACD、RSI 个底层算法。
 *
 * 公式：EMA(today) = price × k + EMA(yesterday) × (1-k)
 * 其中 k = 2/(period+1)，越高越灵敏。
 *
 * 跟 SMA 比，EMA 对近段价格更看重——新数据进来反应更猛，
 * 旧数据个影响指数衰减。起始值直接用 data[0]。
 *
 * @param data   价格序列（收盘价或其他需要平滑个数字）
 * @param period 周期——EMA12 就传 12
 * @returns      同输入一样长个 EMA 数组
 */
export function calcEMA(data: number[], period: number): number[] {
  const result: number[] = []
  if (data.length === 0) return result

  const k = 2 / (period + 1)  // 平滑系数——period 越小 k 越大气
  let prev = data[0]          // 种子——用第一只数据点
  result.push(prev)

  for (let i = 1; i < data.length; i++) {
    prev = data[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

/**
 * 简单移动平均（SMA）——布林带中轨、MA 交叉检测个基础。
 *
 * 就是算近 N 只价格个平均数。前 period-1 位填 NaN——
 * 数据还不够算，后头画图会 filter 掉 NaN 个点。
 * O(n×period)，K线量（几百到几千）吃得消。
 *
 * @param data   价格序列
 * @param period 窗口宽度
 * @returns      等长数组，前 period-1 位 NaN
 */
export function calcSMA(data: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN) // 样本不足——标记无效
    } else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j++) sum += data[j]
      result.push(sum / period)
    }
  }
  return result
}

/**
 * 评分 → 五档评级。阈值设计参考 TradingView 个习惯：
 *
 * - bullish (≥70):  高分——强烈看多
 * - slightly_bullish (≥55): 偏多但不够硬，谨慎看多
 * - neutral (≥45):         中性——多空拉锯，建议观望
 * - slightly_bearish (≥30): 偏空
 * - bearish (<30):         低分——强烈看空
 *
 * 区间边界值判断顺序从上到下，保证每只分数恰好落到一只档位。
 */
export function scoreToRating(score: number): Rating {
  if (score >= 70) return 'bullish'
  if (score >= 55) return 'slightly_bullish'
  if (score >= 45) return 'neutral'
  if (score >= 30) return 'slightly_bearish'
  return 'bearish'
}
