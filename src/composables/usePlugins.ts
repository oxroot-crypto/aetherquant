import { reactive, computed, onMounted, onUnmounted } from 'vue'
import { pluginManager } from '@/plugin-system/PluginManager'
import type { ExchangePlugin, StrategyPlugin } from '@/types'

export function usePlugins() {
  const state = reactive({
    exchanges: [] as ExchangePlugin[],
    strategies: [] as StrategyPlugin[],
    activeExchangeId: null as string | null,
    activeStrategyIds: new Set<string>(),
  })

  let unsub: (() => void) | null = null

  function refresh() {
    state.exchanges = pluginManager.getAllExchanges()
    state.strategies = pluginManager.getAllStrategies()
    state.activeStrategyIds = new Set(
      state.strategies.filter(s => pluginManager.isStrategyActive(s.id)).map(s => s.id)
    )
    const active = pluginManager.getActiveExchange()
    state.activeExchangeId = active?.id ?? null
  }

  onMounted(() => {
    refresh()
    unsub = pluginManager.subscribe(refresh)
  })

  onUnmounted(() => {
    unsub?.()
  })

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
