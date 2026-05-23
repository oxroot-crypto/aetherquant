/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
 *
 * Tauri 原生窗口 composable。先凭 __TAURI_INTERNALS__ 测环境——
 * 在 Tauri WebView 里头才建窗口实例，浏览器里头渠就是 null，
 * 后续调 minimize/toggleMaximize/close 拢是空操作，不会炸。
 *
 * 提供最小化、最大化/还原、关闭三样操作，外加 isMaximized 状态
 * 同 resize 监听。浏览器 dev 模式下窗口按钮直接不渲染。
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

// 检测 Tauri 环境：Tauri WebView 会注入 __TAURI_INTERNALS__ 全局对象
const isTauri = '__TAURI_INTERNALS__' in window
// 如果不在 Tauri 环境就设 null，后续所有操作都会 silent no-op
const win = isTauri ? getCurrentWindow() : null

export function useTauri() {
  const isMaximized = ref(false)
  let unlisten: (() => void) | null = null

  onMounted(async () => {
    if (!win) return
    // 获取初始最大化状态
    isMaximized.value = await win.isMaximized()
    // 监听窗口 resize 事件，实时更新最大化状态（用户拖窗口边缘也会触发）
    unlisten = await win.onResized(async () => {
      isMaximized.value = await win.isMaximized()
    })
  })

  onUnmounted(() => {
    unlisten?.() // 取消 Tauri 事件监听
  })

  function minimize()   { win?.minimize() }
  function toggleMaximize() { win?.toggleMaximize() }
  function close()      { win?.close() }

  return { isTauri, isMaximized, minimize, toggleMaximize, close }
}
