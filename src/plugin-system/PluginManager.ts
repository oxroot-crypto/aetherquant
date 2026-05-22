import type { Plugin, DataSourcePlugin, StrategyPlugin, AnalysisResult } from '@/types'
import type { OHLCV, CandleInterval } from '@/types'

class PluginManagerImpl {
  private dataSources = new Map<string, DataSourcePlugin>()
  private strategies = new Map<string, StrategyPlugin>()
  private activeDataSourceId: string | null = null
  private activeStrategyIds = new Set<string>()
  private listeners = new Set<() => void>()

  registerDataSource(plugin: DataSourcePlugin): void {
    this.dataSources.set(plugin.id, plugin)
    if (!this.activeDataSourceId) {
      this.activeDataSourceId = plugin.id
    }
    this.notify()
  }

  registerStrategy(plugin: StrategyPlugin): void {
    this.strategies.set(plugin.id, plugin)
    this.activeStrategyIds.add(plugin.id)
    this.notify()
  }

  unregisterPlugin(id: string): void {
    this.dataSources.delete(id)
    this.strategies.delete(id)
    this.activeStrategyIds.delete(id)
    if (this.activeDataSourceId === id) {
      const first = this.dataSources.keys().next().value
      this.activeDataSourceId = first ?? null
    }
    this.notify()
  }

  getActiveDataSource(): DataSourcePlugin | null {
    if (!this.activeDataSourceId) return null
    return this.dataSources.get(this.activeDataSourceId) ?? null
  }

  setActiveDataSource(id: string): void {
    if (this.dataSources.has(id)) {
      this.activeDataSourceId = id
      this.notify()
    }
  }

  getAllDataSources(): DataSourcePlugin[] {
    return [...this.dataSources.values()]
  }

  getAllStrategies(): StrategyPlugin[] {
    return [...this.strategies.values()]
  }

  isStrategyActive(id: string): boolean {
    return this.activeStrategyIds.has(id)
  }

  toggleStrategy(id: string): void {
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
    const source = this.getActiveDataSource()
    if (!source) throw new Error('No active data source')
    return source.fetchData(symbol, interval, limit)
  }

  async fetchRange(symbol: string, interval: CandleInterval, startTime: number, endTime: number): Promise<OHLCV[]> {
    const source = this.getActiveDataSource()
    if (!source) throw new Error('No active data source')
    if (source.fetchRange) {
      return source.fetchRange(symbol, interval, startTime, endTime)
    }
    return []
  }

  async runAnalysis(data: OHLCV[]): Promise<AnalysisResult[]> {
    const activeStrategies = this.getActiveStrategies()
    const results = await Promise.all(
      activeStrategies.map(s => {
        try {
          return s.analyze(data)
        } catch {
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
