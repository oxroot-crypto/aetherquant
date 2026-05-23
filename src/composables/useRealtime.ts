import { ref, onUnmounted } from 'vue'
import type { OHLCV, CandleInterval } from '@/types'
import { pluginManager } from '@/plugin-system/PluginManager'

export function useRealtime(onCandle: (candle: OHLCV) => void) {
  const connected = ref(false)
  const lastMsg = ref('')
  let unsub: (() => void) | null = null
  let destroyed = false

  function start(symbol: string, interval: CandleInterval) {
    stop()
    if (destroyed) return
    const coin = symbol.replace('/USDT', '')
    connected.value = true
    lastMsg.value = 'subscribing ' + coin

    unsub = pluginManager.subscribeRealtime(symbol, interval, (c) => {
      lastMsg.value = new Date(c.timestamp).toLocaleTimeString()
      onCandle(c)
    })
  }

  function stop() {
    unsub?.()
    unsub = null
    connected.value = false
  }

  onUnmounted(() => {
    destroyed = true
    stop()
  })

  return { connected, lastMsg, start, stop }
}
