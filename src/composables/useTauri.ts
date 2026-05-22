import { ref, onMounted, onUnmounted } from 'vue'

const isTauri = '__TAURI_INTERNALS__' in window

export function useTauri() {
  const isMaximized = ref(false)
  let unlisten: (() => void) | null = null

  onMounted(async () => {
    if (!isTauri) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    isMaximized.value = await win.isMaximized()
    unlisten = await win.onResized(async () => {
      isMaximized.value = await win.isMaximized()
    })
  })

  onUnmounted(() => {
    unlisten?.()
  })

  async function minimize() {
    if (!isTauri) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  }

  async function toggleMaximize() {
    if (!isTauri) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().toggleMaximize()
  }

  async function close() {
    if (!isTauri) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  }

  return { isTauri, isMaximized, minimize, toggleMaximize, close }
}
