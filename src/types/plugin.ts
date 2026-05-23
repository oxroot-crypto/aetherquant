import type { OHLCV, CandleInterval } from '@/types/data'

export type Rating = 'bullish' | 'slightly_bullish' | 'neutral' | 'slightly_bearish' | 'bearish'

export interface Signal {
  type: 'buy' | 'sell' | 'info'
  message: string
  i18nKey?: string
  i18nParams?: Record<string, string>
  price?: number
  timestamp: number
}

export interface Indicator {
  name: string
  value: number
  displayValue: string
}

export interface AnalysisResult {
  strategyId: string
  strategyName: string
  rating: Rating
  score: number
  signals: Signal[]
  indicators: Indicator[]
  summary: string
  summaryKey?: string
  summaryParams?: Record<string, string>
  timestamp: number
}

export interface StrategyPlugin {
  id: string
  name: string
  version: string
  type: 'strategy'
  description: string
  analyze(data: OHLCV[]): AnalysisResult
}

export interface ExchangePlugin {
  id: string
  name: string
  version: string
  type: 'exchange'
  description: string
  fetchData(symbol: string, interval: CandleInterval, limit: number): Promise<OHLCV[]>
  fetchRange?(symbol: string, interval: CandleInterval, startTime: number, endTime: number): Promise<OHLCV[]>
  subscribe?(symbol: string, interval: CandleInterval, onCandle: (c: OHLCV) => void): () => void
  getSupportedSymbols(): string[]
  getSupportedIntervals(): CandleInterval[]
}

export type Plugin = StrategyPlugin | ExchangePlugin
