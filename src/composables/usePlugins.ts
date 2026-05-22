import { reactive, computed, onMounted, onUnmounted } from 'vue'
import { pluginManager } from '@/plugin-system/PluginManager'
import type { DataSourcePlugin, StrategyPlugin } from '@/types'

export function usePlugins() {
  const state = reactive({
    dataSources: [] as DataSourcePlugin[],
    strategies: [] as StrategyPlugin[],
    activeDataSourceId: null as string | null,
    activeStrategyIds: new Set<string>(),
  })

  let unsub: (() => void) | null = null

  function refresh() {
    state.dataSources = pluginManager.getAllDataSources()
    state.strategies = pluginManager.getAllStrategies()
    state.activeStrategyIds = new Set(
      state.strategies.filter(s => pluginManager.isStrategyActive(s.id)).map(s => s.id)
    )
    const active = pluginManager.getActiveDataSource()
    state.activeDataSourceId = active?.id ?? null
  }

  onMounted(() => {
    refresh()
    unsub = pluginManager.subscribe(refresh)
  })

  onUnmounted(() => {
    unsub?.()
  })

  const activeDataSource = computed(() =>
    state.dataSources.find(ds => ds.id === state.activeDataSourceId) ?? null
  )

  return {
    state,
    activeDataSource,
    setActiveDataSource: (id: string) => pluginManager.setActiveDataSource(id),
    toggleStrategy: (id: string) => pluginManager.toggleStrategy(id),
  }
}
