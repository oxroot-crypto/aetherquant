/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
 *
 * 深色/浅色切换 composable。改 <html> 个 data-theme 属性来切 CSS 变量，
 * 颜色选好哩就写进 localStorage，关哩窗口下回开还记得前次个选择。
 * 默认深色。
 *
 * 单例搞法：模块顶层一只 shared ref，N 个组件 import useTheme()
 * 拢拿到同一只 current，toggle 一下全部组件跟倒变。
 * watchEffect 自动同步 DOM 属性同 localStorage。
 */

import { ref, watchEffect } from 'vue'

type Theme = 'dark' | 'light'

// 从 localStorage 恢复上次选择，默认深色
const saved = (localStorage.getItem('aetherquant-theme') as Theme) || 'dark'
const current = ref<Theme>(saved)

export function useTheme() {
  // 监听 theme 变化，同步更新 DOM 属性同 localStorage
  watchEffect(() => {
    document.documentElement.setAttribute('data-theme', current.value) // 触发 CSS 变量覆盖
    localStorage.setItem('aetherquant-theme', current.value)           // 持久化
  })

  /** 切换深/浅色主题 */
  function toggle() {
    current.value = current.value === 'dark' ? 'light' : 'dark'
  }

  return {
    theme: current,
    toggle,
  }
}
