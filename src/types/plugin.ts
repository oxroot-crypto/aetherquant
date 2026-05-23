/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
 *
 * 插件系统个核心接口，拢个平台个"骨架"。该只文件定好哩 StrategyPlugin
 * 同 ExchangePlugin 两只接口、AnalysisResult 分析结果、Signal 信号、
 * Rating 五档评级——所有插件不实现对应接口就做不得用。
 *
 * 设计讲究：接口先行，定好契约再各自落地。PluginManager 只用调度，
 * 不消晓得每个插件里头搞哩啥哩名堂。该样搞，加新个交易行/新个策略就
 * 只要实现接口就做得，老代码一毛子都不消改。
 */

import type { OHLCV, CandleInterval } from '@/types/data'

/**
 * 五档评级——强看多、较看多、中性、较看空、强看空。
 * 该类型给 AnalysisResult 同 RatingBadge 组件两处用。
 */
export type Rating = 'bullish' | 'slightly_bullish' | 'neutral' | 'slightly_bearish' | 'bearish'

/**
 * 交易信号——每支策略分析完产出 Signal[]。
 * type 分三种：buy 买入（绿）、sell 卖出（红）、info 中性提示（黄）。
 * i18nKey 同 i18nParams 是选填个，冇填就用 message 兜底。
 */
export interface Signal {
  type: 'buy' | 'sell' | 'info'                    // 信号类型：买入/卖出/一般提示
  message: string                                    // 兜底消息——中文
  i18nKey?: string                                   // 有渠就用 i18n 翻译
  i18nParams?: Record<string, string>               // 翻译里向个模板参数
  price?: number                                     // 触发信号时个价格，可冇
  timestamp: number                                  // 信号触发个毫秒戳
}

/**
 * 技术指标值——名称 + 数值 + 格式化好个字符串。
 * displayValue 前头已经 format 好哩（如 "65.32"、"12.5%"），
 * 前端直接渲染，不消重复处理。
 */
export interface Indicator {
  name: string                                       // 指标名（"RSI(14)"、"MA7"）
  value: number                                      // 原值
  displayValue: string                               // 格式化个——前端拿来直显
}

/**
 * 分析结果——每支策略 analyze() 个返回值。
 * score 是 0-100 个连续分，rating 是离散五档，summary 一句话结论。
 * summaryKey/summaryParams 支持 i18n，跟 Signal 个搞法一样。
 */
export interface AnalysisResult {
  strategyId: string                                 // 策略唯一标识，如 "ma-crossover"
  strategyName: string                               // 渠个显示名
  rating: Rating                                     // 评到个档位
  score: number                                      // 0-100 分数
  signals: Signal[]                                  // 信号列表（可能空）
  indicators: Indicator[]                            // 指标值（可能空）
  summary: string                                    // 摘要——中文版
  summaryKey?: string                                // 英文版走该 key
  summaryParams?: Record<string, string>             // 摘要里向个模板参数
  timestamp: number                                  // 分析完成时间 ms
}

/**
 * 策略插件接口——所有量化策略拢要实现该只接口。
 * analyze 是核心：吃进 OHLCV[] 历史数据，吐出 AnalysisResult。
 * 设计上是同步函数——策略就是纯算，不碰 IO，不需要 async。
 */
export interface StrategyPlugin {
  id: string                                         // 唯一 ID，如 "ma-crossover"
  name: string                                       // 给人睇个名
  version: string                                    // 语义化版本
  type: 'strategy'                                  // 类型标签——做类型收窄用
  description: string                                // 一句话讲明该策略做啥哩
  analyze(data: OHLCV[]): AnalysisResult             // 核心——吃数据吐结果
}

/**
 * 交易行插件接口——负责从外头搞数据进来。
 * fetchData: 按根数拉历史 K线（最常用）
 * fetchRange: 按时间范围拉（选填，API 不支持就冇）
 * subscribe: WebSocket 实时推（选填，只支持 HTTP 个交易行就冇渠）
 * getSupportedSymbols/getSupportedIntervals: UI 建列表用，必须同步返回
 *
 * subscribe 为什是选填？因为不是全部交易行都有 WS 推送。
 * 碰到只支持 HTTP 轮询个，不实现渠就做得——PluginManager 会自动 fallback。
 */
export interface ExchangePlugin {
  id: string                                         // 唯一 ID
  name: string                                       // 显示名
  version: string                                    // 版本号
  type: 'exchange'                                  // 类型标签
  description: string                                // 简介
  fetchData(symbol: string, interval: CandleInterval, limit: number): Promise<OHLCV[]>
  fetchRange?(symbol: string, interval: CandleInterval, startTime: number, endTime: number): Promise<OHLCV[]>
  subscribe?(symbol: string, interval: CandleInterval, onCandle: (c: OHLCV) => void): () => void
  getSupportedSymbols(): string[]
  getSupportedIntervals(): CandleInterval[]
}

/**
 * 插件联合类型——StrategyPlugin 或 ExchangePlugin。
 * PluginManager 存 Map 时间用渠做泛型标注。
 */
export type Plugin = StrategyPlugin | ExchangePlugin
