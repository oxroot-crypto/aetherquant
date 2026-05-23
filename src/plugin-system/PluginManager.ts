import type { Plugin, ExchangePlugin, StrategyPlugin, AnalysisResult } from '@/types'
import type { OHLCV, CandleInterval } from '@/types'

class PluginManagerImpl {
  private exchanges = new Map<string, ExchangePlugin>()
  private strategies = new Map<string, StrategyPlugin>()
  private activeExchangeId: string | null = null
  private activeStrategyIds = new Set<string>()
  private listeners = new Set<() => void>()

  registerExchange(plugin: ExchangePlugin): void {
    this.exchanges.set(plugin.id, plugin)
    if (!this.activeExchangeId) {
      this.activeExchangeId = plugin.id
    }
    this.notify()
  }

  registerStrategy(plugin: StrategyPlugin): void {
    this.strategies.set(plugin.id, plugin)
    this.activeStrategyIds.add(plugin.id)
    this.notify()
  }

  unregisterPlugin(id: string): void {
    this.exchanges.delete(id)
    this.strategies.delete(id)
    this.activeStrategyIds.delete(id)
    if (this.activeExchangeId === id) {
      const first = this.exchanges.keys().next().value
      this.activeExchangeId = first ?? null
    }
    this.notify()
  }

  getActiveExchange(): ExchangePlugin | null {
    if (!this.activeExchangeId) return null
    return this.exchanges.get(this.activeExchangeId) ?? null
  }

  setActiveExchange(id: string): void {
    if (this.exchanges.has(id)) {
      this.activeExchangeId = id
      this.notify()
    }
  }

  getAllExchanges(): ExchangePlugin[] {
    return [...this.exchanges.values()]
  }

  getAllStrategies(): StrategyPlugin[] {
    return [...this.strategies.values()]
  }

  isStrategyActive(id: string): boolean {
    return this.activeStrategyIds.has(id)
  }

  toggleStrategy(id: string): void {
    if (!this.strategies.has(id)) return
    if (this.activeStrategyIds.has(id)) {
      this.activeStrategyIds.delete(id)
    } else {
      this.activeStrategyIds.add(id)
    }
    this.notify()
  }

  getActiveStrategies(): StrategyPlugin[] {
    return [...this.strategies.values()].filter(s => this.activeStrategyIds.has(s.id))
  }

  async fetchData(symbol: string, interval: CandleInterval, limit: number): Promise<OHLCV[]> {
    const exchange = this.getActiveExchange()
    if (!exchange) throw new Error('No active exchange')
    return exchange.fetchData(symbol, interval, limit)
  }

  async fetchRange(symbol: string, interval: CandleInterval, startTime: number, endTime: number): Promise<OHLCV[]> {
    const exchange = this.getActiveExchange()
    if (!exchange) throw new Error('No active exchange')
    if (exchange.fetchRange) {
      return exchange.fetchRange(symbol, interval, startTime, endTime)
    }
    return []
  }

  subscribeRealtime(symbol: string, interval: CandleInterval, onCandle: (c: import('@/types').OHLCV) => void): () => void {
    const exchange = this.getActiveExchange()
    if (exchange?.subscribe) {
      return exchange.subscribe(symbol, interval, onCandle)
    }
    return () => {}
  }

  async runAnalysis(data: OHLCV[]): Promise<AnalysisResult[]> {
    const activeStrategies = this.getActiveStrategies()
    const results = await Promise.all(
      activeStrategies.map(s => {
        try {
          return s.analyze(data)
        } catch (e) {
          console.error(`[PluginManager] Strategy "${s.id}" failed:`, e)
          return null
        }
      })
    )
    return results.filter((r): r is AnalysisResult => r !== null)
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach(fn => fn())
  }
}

export const pluginManager = new PluginManagerImpl()
