/**
 * AetherQuant — 加密货币 K线量化分析平台
 * 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
 *
 * OHLCV K线数据同 CandleInterval 周期——量化分析个最小数据单元。
 * 一根 K线六只字段：开高低收量加时间戳。平台里头策略分析、图表渲染
 * 拢走 OHLCV[] 时间序列过，该只类型正讲就是系统个"血液"。
 */

/**
 * K线数据单元。timestamp 是 Unix 毫秒戳，其余是价格/成交量个数字。
 * 要留神——API 过来个价格都是字符串，Number() 转个时间务必做精度处理。
 */
export interface OHLCV {
  timestamp: number   // K线起始时间（Unix ms）
  open: number        // 开盘价
  high: number        // 最高价
  low: number         // 最低价
  close: number       // 收盘价
  volume: number      // 成交量
}

/**
 * K线周期类型。从 1 分钟到 1 周共 8 档。
 * 是 TypeScript 字符串字面量联合类型，编译时就能检查非法值。
 */
export type CandleInterval = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w'
