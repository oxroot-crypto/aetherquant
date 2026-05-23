/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
 *
 * 国际化——vue-i18n 实例。默认走中文，找不着翻译就 fallback 到英文。
 * localStorage 记到上次选个语言，下次开窗口还有效。
 * legacy: false 启用 Vue 3 Composition API 模式，用 useI18n() 拿到实例。
 * toggleLang() 给 TitleBar 个语言切换下拉框调用。
 */

import { createI18n } from 'vue-i18n'
import en from '@/locales/en'
import zh from '@/locales/zh'

// 从 localStorage 恢复语言选择，默认中文
const savedLang = localStorage.getItem('aetherquant-lang') || 'zh'

/** 全局 i18n 实例——main.ts 中 app.use(i18n) 挂载 */
export const i18n = createI18n({
  legacy: false,          // 使用 Composition API 模式（useI18n()）
  locale: savedLang,
  fallbackLocale: 'en',  // 找不到对应翻译时 fallback 到英文
  messages: { en, zh },
})

/**
 * 切换中/英文。返回新语言代码，顺便写 localStorage 持久化。
 */
export function toggleLang(): string {
  const next = i18n.global.locale.value === 'zh' ? 'en' : 'zh'
  i18n.global.locale.value = next
  localStorage.setItem('aetherquant-lang', next)
  return next
}
