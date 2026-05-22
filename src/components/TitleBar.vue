<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import { useTauri } from '@/composables/useTauri'

const { t, locale } = useI18n()
const { theme, toggle: toggleTheme } = useTheme()
const { isTauri, isMaximized, minimize, toggleMaximize, close } = useTauri()

const emit = defineEmits<{
  'update:lang': [lang: string]
}>()

function onLangChange(e: Event) {
  const lang = (e.target as HTMLSelectElement).value
  emit('update:lang', lang)
}
</script>

<template>
  <div class="titlebar" data-tauri-drag-region>
    <div class="titlebar-brand">
      <img src="@/assets/icon.svg" class="titlebar-icon" alt="" />
      <span class="titlebar-title">{{ t('app.title') }}</span>
    </div>

    <div class="titlebar-center" data-tauri-drag-region></div>

    <div class="titlebar-actions">
      <select class="lang-select" :value="locale" @change="onLangChange">
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
      <button class="tb-btn" @click="toggleTheme" :title="theme === 'dark' ? 'Light' : 'Dark'">
        {{ theme === 'dark' ? '☀' : '☾' }}
      </button>

      <div v-if="isTauri" class="window-controls">
        <button class="tb-btn wc-min" @click="minimize" title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="currentColor"/></svg>
        </button>
        <button class="tb-btn wc-max" @click="toggleMaximize" :title="isMaximized ? 'Restore' : 'Maximize'">
          <svg v-if="isMaximized" width="12" height="12" viewBox="0 0 12 12">
            <rect x="3" y="0" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <path d="M0 4v7a1 1 0 0 0 1 1h7" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
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
  user-select: none;
  flex-shrink: 0;
}
.titlebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.titlebar-icon {
  width: 18px;
  height: 18px;
}
.titlebar-title {
  font-size: 13px;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.titlebar-center {
  flex: 1;
  height: 100%;
}
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
.lang-select:hover {
  border-color: var(--border-accent);
}
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
.tb-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}
.window-controls {
  display: flex;
  gap: 2px;
  margin-left: 8px;
}
.wc-close:hover {
  background: #e81123;
  color: #fff;
}
</style>
