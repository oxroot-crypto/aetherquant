import { ref, watchEffect } from 'vue'

type Theme = 'dark' | 'light'

const saved = (localStorage.getItem('aetherquant-theme') as Theme) || 'dark'
const current = ref<Theme>(saved)

export function useTheme() {
  watchEffect(() => {
    document.documentElement.setAttribute('data-theme', current.value)
    localStorage.setItem('aetherquant-theme', current.value)
  })

  function toggle() {
    current.value = current.value === 'dark' ? 'light' : 'dark'
  }

  return {
    theme: current,
    toggle,
  }
}
