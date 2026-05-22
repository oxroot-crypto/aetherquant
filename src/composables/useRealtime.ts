import { ref, onUnmounted } from 'vue'
import type { OHLCV, CandleInterval } from '@/types'

const WS_URL = 'wss://api.hyperliquid.xyz/ws'

interface HlCandle {
  t: number | string; T: number | string; s: string; i: string
  o: number | string; c: number | string; h: number | string
  l: number | string; v: number | string; n: number | string
}

export function useRealtime(onCandle: (candle: OHLCV) => void) {
  const connected = ref(false)
  const lastMsg = ref('')
  let ws: WebSocket | null = null
  let currentCoin = ''
  let currentInterval = ''
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false
  let pendingSub: { coin: string; interval: CandleInterval } | null = null

  function getWs(): WebSocket {
    if (!ws || ws.readyState > WebSocket.OPEN) {
      ws = new WebSocket(WS_URL)
      ws.onopen = onOpen
      ws.onmessage = onMessage
      ws.onclose = onClose
      ws.onerror = onError
    }
    return ws
  }

  function send(msg: unknown) {
    const s = getWs()
    if (s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(msg))
    } else {
      // queue: will be sent in onOpen
      pendingSub = {
        coin: currentCoin || (msg as any)?.subscription?.coin,
        interval: currentInterval || (msg as any)?.subscription?.interval,
      }
    }
  }

  function onOpen() {
    if (destroyed) return
    connected.value = true
    // Re-subscribe current or pending
    const coin = currentCoin || pendingSub?.coin
    const interval = currentInterval || pendingSub?.interval
    pendingSub = null
    if (coin && interval) {
      send({ method: 'subscribe', subscription: { type: 'candle', coin, interval } })
      currentCoin = coin
      currentInterval = interval as CandleInterval
    }
    lastMsg.value = 'connected'
  }

  function onMessage(event: MessageEvent) {
    if (destroyed) return
    try {
      const msg = JSON.parse(event.data)
      const ch = msg.channel || msg.type || ''
      if (ch === 'subscriptionResponse') {
        lastMsg.value = 'subbed ' + currentCoin
        return
      }
      const raw = msg.data
      if (!raw) return
      const candles: HlCandle[] = Array.isArray(raw) ? raw : [raw]
      for (const c of candles) {
        if (!c.t || !c.s) continue
        // Only process if this candle matches current subscription
        if (c.s !== currentCoin || (c.i && c.i !== currentInterval)) continue
        lastMsg.value = new Date(Number(c.t)).toLocaleTimeString()
        onCandle({
          timestamp: Number(c.t),
          open: Number(c.o),
          high: Number(c.h),
          low: Number(c.l),
          close: Number(c.c),
          volume: Number(c.v),
        })
      }
    } catch { /* skip */ }
  }

  function onClose() {
    if (destroyed) return
    connected.value = false
    // Reconnect and re-subscribe
    reconnectTimer = setTimeout(() => {
      if (destroyed) return
      ws = null
      const s = getWs()
      if (s.readyState === WebSocket.CONNECTING) {
        pendingSub = { coin: currentCoin, interval: currentInterval as CandleInterval }
      }
    }, 3000)
  }

  function onError() {
    ws?.close()
  }

  function connect(coin: string, interval: CandleInterval) {
    if (destroyed) return

    const oldCoin = currentCoin
    const oldInterval = currentInterval

    // Unsubscribe old
    if (ws && ws.readyState === WebSocket.OPEN && oldCoin && oldInterval) {
      send({ method: 'unsubscribe', subscription: { type: 'candle', coin: oldCoin, interval: oldInterval } })
    }

    // Update current
    currentCoin = coin
    currentInterval = interval

    // Subscribe new
    send({ method: 'subscribe', subscription: { type: 'candle', coin, interval } })
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (ws) {
      ws.onclose = null
      ws.onerror = null
      ws.onmessage = null
      ws.onopen = null
      ws.close()
      ws = null
    }
    connected.value = false
  }

  onUnmounted(() => {
    destroyed = true
    disconnect()
  })

  return { connected, lastMsg, connect, disconnect }
}
