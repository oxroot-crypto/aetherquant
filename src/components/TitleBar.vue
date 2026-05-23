<script setup lang="ts">
/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 自定义标题栏——代用系统原生个窗口边框（frameless chrome）。
 * 左边是 app logo + 渐变字标题，右边是语言切换、主题按钮、
 * 同 Tauri 原生三粒窗口控制（最小化/最大化/关闭）。
 * data-tauri-drag-region 属性让整条栏都能拖拽窗口。
 *
 * 为什不用系统原生标题栏？要暗色主题、要跨平台一样好看、
 * 还要拖拽——系统个满足不了。tauri.conf.json 设 decorations: false，
 * 全靠该组件撑场。
 */

import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import { useTauri } from '@/composables/useTauri'

const { t, locale } = useI18n()
const { theme, toggle: toggleTheme } = useTheme()
const { isTauri, isMaximized, minimize, toggleMaximize, close } = useTauri()

// 语言切换事件往上 emit 给 App.vue 做全局切换 + 持久化
const emit = defineEmits<{
  'update:lang': [lang: string]
}>()

function onLangChange(e: Event) {
  const lang = (e.target as HTMLSelectElement).value
  emit('update:lang', lang)
}
</script>

<template>
  <!-- data-tauri-drag-region 使整条标题栏成为可拖拽区域（Tauri 独有功能） -->
  <div class="titlebar" data-tauri-drag-region>
    <!-- 左侧品牌区：icon + 名称 -->
    <div class="titlebar-brand">
      <img src="@/assets/icon.svg" class="titlebar-icon" alt="" />
      <!-- 标题用渐变色文字（accent-gradient） -->
      <span class="titlebar-title">{{ t('app.title') }}</span>
    </div>

    <!-- 中间空白区域，可拖拽 -->
    <div class="titlebar-center" data-tauri-drag-region></div>

    <!-- 右侧操作按钮区 -->
    <div class="titlebar-actions">
      <!-- 语言切换下拉框 -->
      <select class="lang-select" :value="locale" @change="onLangChange">
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>

      <!-- 主题切换按钮：☀ 亮色 / ☾ 暗色 -->
      <button class="tb-btn" @click="toggleTheme" :title="theme === 'dark' ? 'Light' : 'Dark'">
        {{ theme === 'dark' ? '☀' : '☾' }}
      </button>

      <!-- Tauri 窗口控制按钮（浏览器中不渲染） -->
      <div v-if="isTauri" class="window-controls">
        <!-- 最小化 -->
        <button class="tb-btn wc-min" @click="minimize" title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="currentColor"/></svg>
        </button>
        <!-- 最大化 / 还原 -->
        <button class="tb-btn wc-max" @click="toggleMaximize" :title="isMaximized ? 'Restore' : 'Maximize'">
          <svg v-if="isMaximized" width="12" height="12" viewBox="0 0 12 12">
            <rect x="3" y="0" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <path d="M0 4v7a1 1 0 0 0 1 1h7" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
        <!-- 关闭：hover 时背景变红 -->
        <button class="tb-btn wc-close" @click="close" title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 8px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
  user-select: none;   /* 禁止选中文字，拖拽时不会出现蓝底 */
  flex-shrink: 0;
}
.titlebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.titlebar-icon { width: 18px; height: 18px; }

/* 标题渐变色：background-clip 文字透明填充 */
.titlebar-title {
  font-size: 13px;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 中间区域占满剩余空间，拖拽窗口 */
.titlebar-center { flex: 1; height: 100%; }

/* 按钮区域取消拖拽——否则按钮点不到 */
.titlebar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.lang-select {
  padding: 2px 6px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}
.lang-select:hover { border-color: var(--border-accent); }

.tb-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  padding: 0;
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.tb-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }

.window-controls { display: flex; gap: 2px; margin-left: 8px; }
.wc-close:hover { background: #e81123; color: #fff; } /* 关闭按钮 hover 红色，符合 Windows 习惯 */
</style>
