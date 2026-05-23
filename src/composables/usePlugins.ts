/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
 *
 * 插件状态 composable——把 PluginManager 个纯 JS 状态桥接到 Vue 响应式。
 * 为什不直接用 computed 从 PluginManager 读？因为渠不是 Vue 响应式对象，
 * 得用 reactive() 手动镜像 + subscribe() 监听变化。
 *
 * PluginManager 调 notify() → refresh() 拉最新状态 → reactive 写进去
 * → Vue 自动更新视图。该座桥一搭好，插件注册/切换/启停拢能实时反映到 UI。
 */

import { reactive, computed, onMounted, onUnmounted } from 'vue'
import { pluginManager } from '@/plugin-system/PluginManager'
import type { ExchangePlugin, StrategyPlugin } from '@/types'

export function usePlugins() {
  // reactive 包装——每次 refresh() 写进去触发 Vue 依赖更新
  const state = reactive({
    exchanges: [] as ExchangePlugin[],
    strategies: [] as StrategyPlugin[],
    activeExchangeId: null as string | null,
    activeStrategyIds: new Set<string>(),
  })

  let unsub: (() => void) | null = null

  /**
   * 从 PluginManager 拉取最新状态，同步到响应式 state 对象。
   * 该函数被 PluginManager.subscribe() 注册为回调——每次插件状态变化都会调用。
   */
  function refresh() {
    state.exchanges = pluginManager.getAllExchanges()
    state.strategies = pluginManager.getAllStrategies()
    // 重建 Set——不能直接赋值因为可能还是同一个引用
    state.activeStrategyIds = new Set(
      state.strategies.filter(s => pluginManager.isStrategyActive(s.id)).map(s => s.id)
    )
    const active = pluginManager.getActiveExchange()
    state.activeExchangeId = active?.id ?? null
  }

  onMounted(() => {
    refresh() // 初始加载
    unsub = pluginManager.subscribe(refresh) // 注册变化监听
  })

  onUnmounted(() => {
    unsub?.() // 取消订阅
  })

  /** computed 导出激活的交易行对象，方便组件直接取用 */
  const activeExchange = computed(() =>
    state.exchanges.find(e => e.id === state.activeExchangeId) ?? null
  )

  return {
    state,
    activeExchange,
    setActiveExchange: (id: string) => pluginManager.setActiveExchange(id),
    toggleStrategy: (id: string) => pluginManager.toggleStrategy(id),
  }
}
