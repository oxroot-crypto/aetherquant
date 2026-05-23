/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
 *
 * 实时行情 composable。包住哩 PluginManager 个 WebSocket 订阅，
 * 对外就四样：connected 在线状态、lastMsg 最新消息时间、start 开流、
 * stop 停流。组件销毁（onUnmounted）时自动停流——不消担心内存漏。
 *
 * App.vue 里头该样用：useRealtime(onCandle)，切币对/周期就 start，
 * WS 有推送就调 onCandle 写进图表。
 */

import { ref, onUnmounted } from 'vue'
import type { OHLCV, CandleInterval } from '@/types'
import { pluginManager } from '@/plugin-system/PluginManager'

export function useRealtime(onCandle: (candle: OHLCV) => void) {
  // connected: WebSocket 是否处于活跃订阅状态
  const connected = ref(false)
  // lastMsg: 最后收到消息的时间戳（用于 UI 显示"最后更新于 XX:XX"）
  const lastMsg = ref('')

  let unsub: (() => void) | null = null   // 当前订阅取消函数
  let destroyed = false                     // 组件销毁标志

  /**
   * 启动实时订阅。先停掉旧订阅再开新的（stop and swap）。
   * 如果组件已销毁就什么都不做，防止在 unmounted 后的异步回调中出错。
   */
  function start(symbol: string, interval: CandleInterval) {
    stop()               // 停掉旧订阅
    if (destroyed) return // 组件已销毁，bye

    const coin = symbol.replace('/USDT', '')
    connected.value = true
    lastMsg.value = 'subscribing ' + coin

    // 注册回调到 PluginManager，拿到取消订阅函数
    unsub = pluginManager.subscribeRealtime(symbol, interval, (c) => {
      lastMsg.value = new Date(c.timestamp).toLocaleTimeString()
      onCandle(c)
    })
  }

  /**
   * 停止实时订阅。调用取消订阅函数并重置状态。
   */
  function stop() {
    unsub?.()
    unsub = null
    connected.value = false
  }

  // 组件销毁：设置标志 + 取消订阅，确保不再有异步回调执行
  onUnmounted(() => {
    destroyed = true
    stop()
  })

  return { connected, lastMsg, start, stop }
}
