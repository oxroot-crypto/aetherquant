/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * Hyperliquid DEX 交易行插件——目前拢个平台就只接哩该一只交易行。
 * 渠实现哩 ExchangePlugin 接口，分三层做事：
 *
 * HTTP 层：fetchByRange 发 POST 到 api.hyperliquid.xyz/info，
 *   请求体 type 是 candleSnapshot，拿到原始 K线做四舍五入再返回。
 *
 * 缓存层：candleCache Map 做内存缓存，key 是 "coin:interval:limit"，
 *   TTL 30 秒，超哩就重新拉。超过 50 条个时间最早个先淘汰（LRU）。
 *
 * WebSocket 层：全局就维持一根 wss 连接，不消反复建连。
 *   切换币对个时间先发 unsubscribe 取消旧订阅，再 subscribe 新个。
 *   断了会自动等 3 秒重连，onopen 恢复之前个订阅。
 *
 * 容错：Hyperliquid API 挂哩或者返回空数据就降级到 FALLBACK_COINS
 *   （BTC/ETH/SOL 等 14 种主流币），确保应用不会白屏。
 *   fetchMetaCoins 用 dedup promise，多个并发调也只发一次请求。
 */

import type { ExchangePlugin, OHLCV, CandleInterval } from '@/types'

// Hyperliquid DEX 个 HTTP 接口地址
const API_URL = 'https://api.hyperliquid.xyz/info'

/**
 * API 挂哩或返回空数据个时间用渠兜底——14 种主流币，保证应用不白屏。
 */
const FALLBACK_COINS = [
  'BTC', 'ETH', 'SOL', 'ARB', 'OP', 'LINK', 'DOGE',
  'MATIC', 'AVAX', 'ATOM', 'SUI', 'BNB', 'XRP', 'LTC',
]

// coin 缓存：null 表示还冇拉过
let cachedCoins: string[] | null = null
// 正在发个请求——防并发重复调用
let coinFetchPromise: Promise<string[]> | null = null

/** Hyperliquid 用裸币名 ("BTC")，UI 要带 "/USDT" 后缀 */
function toDisplaySymbol(coin: string): string {
  return `${coin}/USDT`
}

/** 反向剥离——"BTC/USDT" → "BTC" */
function fromDisplaySymbol(symbol: string): string {
  return symbol.replace('/USDT', '')
}

/**
 * 拉全部币种（universe）。两层缓存：
 * - cachedCoins：成功就永久缓存
 * - coinFetchPromise：防并发——N 个地方同时调也只发一记 HTTP
 * 失败或空数组就降级到 FALLBACK_COINS，不抛异常。
 */
async function fetchMetaCoins(): Promise<string[]> {
  if (cachedCoins) return cachedCoins
  if (coinFetchPromise) return coinFetchPromise // 别人还在拉，等结果就行

  coinFetchPromise = (async () => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meta' }),
      })
      if (!res.ok) throw new Error('Meta fetch failed')
      const data = await res.json()
      const universe: Array<{ name: string }> = data?.universe ?? []
      const coins = universe.map((u: { name: string }) => u.name).filter((n: string) => n)
      if (coins.length > 0) {
        cachedCoins = coins
        return coins
      }
    } catch {
      // API 挂了也不抛异常，silently 降级到内置列表
    }
    cachedCoins = FALLBACK_COINS
    return FALLBACK_COINS
  })()

  return coinFetchPromise
}

/**
 * 同步拿币种（从缓存读）。getSupportedSymbols 必须同步返回，
 * 所以这里不搞 async——直接从缓存 snap。
 */
function getCoins(): string[] {
  return cachedCoins ?? FALLBACK_COINS
}

/**
 * 智能四舍五入——价高个币（≥$1）留两位小数就够，
 * 低价币（< $1）要留五位，不然精度不够睇。
 */
function round(n: number): number {
  if (n >= 1) return Math.round(n * 100) / 100     // >= 1：精确到分
  return Math.round(n * 100000) / 100000            // < 1：精确到 0.00001
}

/**
 * Hyperliquid API 返个原数据形状——t/T s i o/h/l/c v n。
 */
interface HlCandle {
  t: number
  T: number
  s: string
  i: string
  o: number
  c: number
  h: number
  l: number
  v: number
  n: number
}

interface HlResponse {
  type: string
  candles?: HlCandle[]
}

// 内存缓存——key = "coin:interval:limit"，30 秒过就失效
const candleCache = new Map<string, { data: OHLCV[]; time: number }>()
const CACHE_TTL = 30000

/** 周期 → 毫秒，如 '1h' → 3600000，未知默认 1h */
function intervalToMs(interval: CandleInterval): number {
  const map: Record<string, number> = {
    '1m': 60_000, '3m': 180_000, '5m': 300_000, '15m': 900_000,
    '30m': 1_800_000, '1h': 3_600_000, '4h': 14_400_000,
    '1d': 86_400_000, '1w': 604_800_000,
  }
  return map[interval] ?? 3_600_000
}

/**
 * 核心 HTTP 请求——发 candleSnapshot，数据回厂做 round 精度处理，
 * 最后按时间升序排——API 有时乱序返回，不排就画图蛮丑。
 */
async function fetchByRange(
  coin: string,
  interval: CandleInterval,
  startTime: number,
  endTime: number,
): Promise<OHLCV[]> {
  const body = JSON.stringify({
    type: 'candleSnapshot',
    req: { coin, interval, startTime, endTime },
  })

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (!res.ok) {
    throw new Error(`Hyperliquid API error: ${res.status}`)
  }

  const data: HlCandle[] = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Unexpected Hyperliquid API response')
  }

  // 转换 + round + 排序——API 返回可能乱序个
  return data
    .map((c): OHLCV => ({
      timestamp: Number(c.t),
      open: round(Number(c.o)),
      high: round(Number(c.h)),
      low: round(Number(c.l)),
      close: round(Number(c.c)),
      volume: round(Number(c.v)),
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}

// WebSocket 地址
const WS_URL = 'wss://api.hyperliquid.xyz/ws'

/**
 * WS 全局状态——拢个应用就一根连接。
 * wsSubs: 按 "coin:interval" 分组存回调——支持多组件同流
 * wsDestroyed: 防组件销毁后还要重连
 */
let wsInstance: WebSocket | null = null
let wsSubs: Map<string, Array<(c: OHLCV) => void>> = new Map()
let wsCoin = ''
let wsInterval = ''
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null
let wsDestroyed = false

/** 生成 WS key——"coin:interval" */
function wsKey(coin: string, interval: string) { return `${coin}:${interval}` }

/**
 * 拿（或建）WebSocket——单连接，全局就一根。
 * 已关或关闭中就重建。onopen 自动恢复订阅，
 * onmessage 解析 candle 按 key 分发，onclose 3 秒后重连。
 */
function getWs(): WebSocket {
  // null 或 readyState > 1 (CLOSING/CLOSED) → 要重建
  if (!wsInstance || wsInstance.readyState > WebSocket.OPEN) {
    wsInstance = new WebSocket(WS_URL)

    // 连上哩——有旧订阅就自动恢复
    wsInstance.onopen = () => {
      if (wsCoin && wsInterval) {
        wsInstance!.send(JSON.stringify({
          method: 'subscribe',
          subscription: { type: 'candle', coin: wsCoin, interval: wsInterval },
        }))
      }
    }

    // 收到数据——可能是单条也可能是数组，统一处理
    wsInstance.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const candles = Array.isArray(msg.data) ? msg.data as HlCandle[] : (msg.data ? [msg.data as HlCandle] : [])
        for (const c of candles) {
          if (!c.t || !c.s) continue                         // 缺关键字段——跳过
          if (c.s !== wsCoin || (c.i && c.i !== wsInterval)) continue // 不是当前币/周期——跳过
          const ohlcv: OHLCV = {
            timestamp: Number(c.t), open: Number(c.o), high: Number(c.h),
            low: Number(c.l), close: Number(c.c), volume: Number(c.v),
          }
          const key = wsKey(wsCoin, wsInterval)
          const subs = wsSubs.get(key)
          if (subs) for (const fn of subs) fn(ohlcv)        // 逐个回调投递
        }
      } catch { /* JSON 解析败了就跳——一条脏数据不影响全局 */ }
    }

    // 断哩——3 秒后重连，除非已销毁
    wsInstance.onclose = () => {
      if (wsDestroyed) return
      wsReconnectTimer = setTimeout(() => {
        wsInstance = null
        getWs()
      }, 3000)
    }

    // 出错直接关——走 onclose 重连逻辑
    wsInstance.onerror = () => wsInstance?.close()
  }
  return wsInstance
}

/**
 * 订阅实时流——返回取消函数。核心机制：
 * 切币对/周期个时间先 unsub 旧个（服务端就不推老数据哩），
 * 再 sub 新个。如果 WS 还冇连上，onopen 里向自动发 subscribe。
 * global 变量 wsCoin/wsInterval 就是当前 WS 实际订个，
 * 同参数一比对就晓得要不要切换。
 */
function subscribeWs(coin: string, interval: CandleInterval, onCandle: (c: OHLCV) => void): () => void {
  if (wsDestroyed) return () => {}

  const oldCoin = wsCoin
  const oldInterval = wsInterval
  const newKey = wsKey(coin, String(interval))

  const ws = getWs()
  const isNewStream = coin !== oldCoin || interval !== oldInterval

  // 换流——先取消旧订阅
  if (isNewStream && ws.readyState === WebSocket.OPEN && oldCoin) {
    ws.send(JSON.stringify({
      method: 'unsubscribe',
      subscription: { type: 'candle', coin: oldCoin, interval: oldInterval },
    }))
  }

  wsCoin = coin
  wsInterval = interval as string

  // 发新订阅——WS 还冇开就等 onopen 自动发
  if (isNewStream && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      method: 'subscribe',
      subscription: { type: 'candle', coin, interval },
    }))
  }

  // 注册回调
  if (!wsSubs.has(newKey)) wsSubs.set(newKey, [])
  wsSubs.get(newKey)!.push(onCandle)

  // 取消函数——从回调列表里拔出去，全部清干净就删 key
  return () => {
    const subs = wsSubs.get(newKey)
    if (subs) {
      const idx = subs.indexOf(onCandle)
      if (idx >= 0) subs.splice(idx, 1)
      if (subs.length === 0) wsSubs.delete(newKey)
    }
  }
}

export { fetchMetaCoins }

/**
 * 插件实例——实现 ExchangePlugin，每个方法只做最小参数转换就丢给内部函数。
 */
export const hyperliquidSource: ExchangePlugin = {
  id: 'hyperliquid',
  name: 'Hyperliquid',
  version: '1.0.0',
  type: 'exchange',
  description: 'Perpetuals DEX — high-performance L1, fully on-chain order book',

  /**
   * 拉最近 limit 根。先查缓存（30s TTL），冇命中才走 HTTP。
   * 请求范围加一倍保险（limit×2），拉回来截最后 limit 条。
   * 缓存超 50 条就删最早个（LRU）。
   */
  async fetchData(symbol: string, interval: CandleInterval, limit: number): Promise<OHLCV[]> {
    const coin = fromDisplaySymbol(symbol)

    // 缓存查——命中就直回，省 HTTP
    const cacheKey = `${coin}:${interval}:${limit}`
    const cached = candleCache.get(cacheKey)
    if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data

    const now = Date.now()
    // 多拉一倍保证够，再截尾部
    const data = await fetchByRange(coin, interval, now - limit * intervalToMs(interval) * 2, now)
    const trimmed = data.slice(-limit)

    candleCache.set(cacheKey, { data: trimmed, time: Date.now() })

    // LRU——超 50 条就删 Map 第一只 (最早个)
    while (candleCache.size > 50) {
      const first = candleCache.keys().next().value
      if (first) candleCache.delete(first)
    }

    return trimmed
  },

  /** 按时间范围拉——thin wrapper，直接掉 fetchByRange */
  async fetchRange(symbol: string, interval: CandleInterval, startTime: number, endTime: number): Promise<OHLCV[]> {
    const coin = fromDisplaySymbol(symbol)
    return fetchByRange(coin, interval, startTime, endTime)
  },

  /** 实时订阅——thin wrapper，只做币名转换 */
  subscribe(symbol: string, interval: CandleInterval, onCandle: (c: OHLCV) => void): () => void {
    const coin = fromDisplaySymbol(symbol)
    return subscribeWs(coin, interval, onCandle)
  },

  /**
   * 支持个币种列表（同步）。API 还冇返就用降级列表。
   * fetchMetaCoins() 是 fire-and-forget——后台拉，回来以后
   * 再调一次就能拿到全量。
   */
  getSupportedSymbols(): string[] {
    fetchMetaCoins()
    return getCoins().map(toDisplaySymbol)
  },

  /** 该交易行支持个全部周期 */
  getSupportedIntervals(): CandleInterval[] {
    return ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']
  },
}
