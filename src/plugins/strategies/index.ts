/**
 * AetherQuant — 加密货币 K线量化分析平台
 * 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
 *
 * 五支量化策略个统出一口子。外头 import 该个模块就拿齐全部策略：
 * 均线金叉死叉（MA） / MACD 动能 / RSI 超买超卖 / 布林带波动率 / EMA 多周期排列。
 * 每支策略独立打分，拢共加权平均得出综合评级。
 */

export { maStrategy } from '@/plugins/strategies/ma-strategy'
export { macdStrategy } from '@/plugins/strategies/macd-strategy'
export { rsiStrategy } from '@/plugins/strategies/rsi-strategy'
export { bollingerStrategy } from '@/plugins/strategies/bollinger-strategy'
export { emaStrategy } from '@/plugins/strategies/ema-strategy'
