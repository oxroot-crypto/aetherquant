import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

const isTauri = '__TAURI_INTERNALS__' in window
const win = isTauri ? getCurrentWindow() : null

export function useTauri() {
  const isMaximized = ref(false)
  let unlisten: (() => void) | null = null

  onMounted(async () => {
    if (!win) return
    isMaximized.value = await win.isMaximized()
    unlisten = await win.onResized(async () => {
      isMaximized.value = await win.isMaximized()
    })
  })

  onUnmounted(() => {
    unlisten?.()
  })

  function minimize() {
    win?.minimize()
  }

  function toggleMaximize() {
    win?.toggleMaximize()
  }

  function close() {
    win?.close()
  }

  return { isTauri, isMaximized, minimize, toggleMaximize, close }
}
