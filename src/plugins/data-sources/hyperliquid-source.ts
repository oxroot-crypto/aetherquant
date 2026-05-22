import type { DataSourcePlugin, OHLCV, CandleInterval } from '@/types'

const API_URL = 'https://api.hyperliquid.xyz/info'

const FALLBACK_COINS = [
  'BTC', 'ETH', 'SOL', 'ARB', 'OP', 'LINK', 'DOGE',
  'MATIC', 'AVAX', 'ATOM', 'SUI', 'BNB', 'XRP', 'LTC',
]

let cachedCoins: string[] | null = null
let coinFetchPromise: Promise<string[]> | null = null

function toDisplaySymbol(coin: string): string {
  return `${coin}/USDT`
}

function fromDisplaySymbol(symbol: string): string {
  return symbol.replace('/USDT', '')
}

async function fetchMetaCoins(): Promise<string[]> {
  if (cachedCoins) return cachedCoins
  if (coinFetchPromise) return coinFetchPromise

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
      // fallback
    }
    cachedCoins = FALLBACK_COINS
    return FALLBACK_COINS
  })()

  return coinFetchPromise
}

function getCoins(): string[] {
  return cachedCoins ?? FALLBACK_COINS
}

function round(n: number): number {
  if (n >= 1) return Math.round(n * 100) / 100
  return Math.round(n * 100000) / 100000
}

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

const candleCache = new Map<string, { data: OHLCV[]; time: number }>()
const CACHE_TTL = 30000

function intervalToMs(interval: CandleInterval): number {
  const map: Record<string, number> = {
    '1m': 60_000,
    '3m': 180_000,
    '5m': 300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '4h': 14_400_000,
    '1d': 86_400_000,
    '1w': 604_800_000,
  }
  return map[interval] ?? 3_600_000
}

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

export { fetchMetaCoins }

export const hyperliquidSource: DataSourcePlugin = {
  id: 'hyperliquid',
  name: 'Hyperliquid',
  version: '1.0.0',
  type: 'data-source',
  description: 'Real-time candlestick data from Hyperliquid DEX via info API',

  async fetchData(symbol: string, interval: CandleInterval, limit: number): Promise<OHLCV[]> {
    const coin = fromDisplaySymbol(symbol)
    const cacheKey = `${coin}:${interval}:${limit}`

    const cached = candleCache.get(cacheKey)
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return cached.data
    }

    const now = Date.now()
    const data = await fetchByRange(coin, interval, now - limit * intervalToMs(interval) * 2, now)
    const trimmed = data.slice(-limit)
    candleCache.set(cacheKey, { data: trimmed, time: Date.now() })

    while (candleCache.size > 50) {
      const first = candleCache.keys().next().value
      if (first) candleCache.delete(first)
    }

    return trimmed
  },

  async fetchRange(symbol: string, interval: CandleInterval, startTime: number, endTime: number): Promise<OHLCV[]> {
    const coin = fromDisplaySymbol(symbol)
    return fetchByRange(coin, interval, startTime, endTime)
  },

  getSupportedSymbols(): string[] {
    fetchMetaCoins() // fire-and-forget to populate cache
    return getCoins().map(toDisplaySymbol)
  },

  getSupportedIntervals(): CandleInterval[] {
    return ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']
  },
}
