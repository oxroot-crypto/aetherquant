/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 插件管理器——拢个平台个"调度中枢"，单例。渠管到两套插件：
 * 交易行（exchanges）同策略（strategies）。注册、注销、切换拢走该只类。
 * 数据拉取、WebSocket 实时订阅、策略分析全通过渠转发调度。
 * 用到发布/订阅模式（listeners），状态一变就通知 UI 刷新——Vue 组件
 * 不消轮询，坐等通知就做得。
 *
 * 里头个搞法：new PluginManagerImpl()，全局就一只实例。
 * exports Map 存交易行，strategies Map 存策略。
 * 新注册个策略默认激活，新交易行自动当默认。
 * module 末尾直接 export const pluginManager，哪里要用就 import 渠。
 */

import type { Plugin, ExchangePlugin, StrategyPlugin, AnalysisResult } from '@/types'
import type { OHLCV, CandleInterval } from '@/types'

class PluginManagerImpl {
  // Map 三只拢是纯 JS 数据结构——不可被 Vue 深度代理，只能靠 subscribe/notify 手动同步
  private exchanges = new Map<string, ExchangePlugin>()      // key = 插件 id，存交易行
  private strategies = new Map<string, StrategyPlugin>()     // key = 插件 id，存策略
  private activeExchangeId: string | null = null             // 当前激活个交易行，注册过就非 null
  private activeStrategyIds = new Set<string>()              // 启用中个策略 ID 集——默认全开
  private listeners = new Set<() => void>()                  // pub/sub 订阅者回调集合

  /**
   * 注册交易行。头一只注册个自动当默认——不用再手动切换。
   * 调完 notify 通知 Vue 刷新下拉列表。
   */
  registerExchange(plugin: ExchangePlugin): void {
    this.exchanges.set(plugin.id, plugin)
    if (!this.activeExchangeId) {
      this.activeExchangeId = plugin.id // 第一只，默认选中
    }
    this.notify()
  }

  /**
   * 注册策略。默认就激活——加进 activeStrategyIds。
   * 想默认关就注册完再调 toggleStrategy。
   */
  registerStrategy(plugin: StrategyPlugin): void {
    this.strategies.set(plugin.id, plugin)
    this.activeStrategyIds.add(plugin.id)
    this.notify()
  }

  /**
   * 删一只插件（交易行或策略都可以）。
   * 删个若是当前激活交易行，自动切到 Map 底下一只。
   * 拢冇了就 null——UI 会显示 Select...。
   */
  unregisterPlugin(id: string): void {
    this.exchanges.delete(id)
    this.strategies.delete(id)
    this.activeStrategyIds.delete(id)
    if (this.activeExchangeId === id) {
      const first = this.exchanges.keys().next().value // Map 迭代器取第一个 key
      this.activeExchangeId = first ?? null
    }
    this.notify()
  }

  /** 取当前激活个交易行对象——冇就 null */
  getActiveExchange(): ExchangePlugin | null {
    if (!this.activeExchangeId) return null
    return this.exchanges.get(this.activeExchangeId) ?? null
  }

  /** 切激活交易行。id 不在注册表里就无声忽略 */
  setActiveExchange(id: string): void {
    if (this.exchanges.has(id)) {
      this.activeExchangeId = id
      this.notify()
    }
  }

  /** 全部交易行列表——展开返回新数组，防外部误改内部 Map */
  getAllExchanges(): ExchangePlugin[] {
    return [...this.exchanges.values()]
  }

  /** 全部策略列表 */
  getAllStrategies(): StrategyPlugin[] {
    return [...this.strategies.values()]
  }

  /** 查某策略激活彳不——给 UI 组件显示开关状态 */
  isStrategyActive(id: string): boolean {
    return this.activeStrategyIds.has(id)
  }

  /** 翻转策略启用状态：开着就关，关着就开 */
  toggleStrategy(id: string): void {
    if (!this.strategies.has(id)) return
    if (this.activeStrategyIds.has(id)) {
      this.activeStrategyIds.delete(id)
    } else {
      this.activeStrategyIds.add(id)
    }
    this.notify()
  }

  /** 捞激活中个策略列表——给 runAnalysis 用 */
  getActiveStrategies(): StrategyPlugin[] {
    return [...this.strategies.values()].filter(s => this.activeStrategyIds.has(s.id))
  }

  /** 拉历史 K线——委托给激活个交易行。冇交易行就抛 Error */
  async fetchData(symbol: string, interval: CandleInterval, limit: number): Promise<OHLCV[]> {
    const exchange = this.getActiveExchange()
    if (!exchange) throw new Error('No active exchange')
    return exchange.fetchData(symbol, interval, limit)
  }

  /** 按时间范围拉——fetchRange 是选填个，交易行冇实现就返空数组 */
  async fetchRange(symbol: string, interval: CandleInterval, startTime: number, endTime: number): Promise<OHLCV[]> {
    const exchange = this.getActiveExchange()
    if (!exchange) throw new Error('No active exchange')
    if (exchange.fetchRange) {
      return exchange.fetchRange(symbol, interval, startTime, endTime)
    }
    return []
  }

  /** 实时订阅——转发给交易行个 subscribe。冇推送能力就返空函数（no-op） */
  subscribeRealtime(symbol: string, interval: CandleInterval, onCandle: (c: import('@/types').OHLCV) => void): () => void {
    const exchange = this.getActiveExchange()
    if (exchange?.subscribe) {
      return exchange.subscribe(symbol, interval, onCandle)
    }
    return () => {} // no-op——安全，调方不会崩
  }

  /**
   * 并行跑全部分析——Promise.all + 独立 try/catch。
   * 每一支策略包在自家 try 里头，一只挂不影响别人。
   * 挂个打 error 日志 + 返 null，最后 filter 滤掉——
   * (r is AnalysisResult) 是 TS 类型谓词，让返回值类型收窄。
   */
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

  /** pub/sub 注册监听器。返回取消函数——组件 unmount 时调就解绑 */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** 内部通知——遍历所有 listener 调一遍。只有内部状态变化时走渠 */
  private notify(): void {
    this.listeners.forEach(fn => fn())
  }
}

// 全局单例——拢个应用就 new 一只
export const pluginManager = new PluginManagerImpl()
