<script setup lang="ts">
/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 工具栏组件——拢是 UI 层个事，不碰数据逻辑。左边三栏：
 * 交易行下拉（ExchangeSelector）、带搜索个币种选择器（CoinSelector）、
 * K线周期按钮组（1m~1w）。选择一变就 emitAll 通知 App.vue，
 * 父组件自己决定啷样拉数据。
 *
 * 右边是刷新按钮，中间 slot 插 WebSocket 在线状态灯。
 * 只做展示层，网络请求、分析调度拢不粘边。
 */

import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CoinSelector from '@/components/CoinSelector.vue'
import ExchangeSelector from '@/components/ExchangeSelector.vue'
import type { CandleInterval } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  symbols: string[]       // 可选的交易对列表
  exchanges: { id: string; name: string; description: string }[]
  activeExchangeId: string | null
}>()

const emit = defineEmits<{
  'update:symbol': [symbol: string]
  'update:interval': [interval: CandleInterval]
  'update:exchange': [exchangeId: string]
  refresh: []
}>()

// 本地选中值：默认取列表第一个，没有就空字符串
const selectedSymbol = ref(props.symbols[0] ?? '')
const selectedInterval = ref<CandleInterval>('1h')

// 当外部 symbols 列表变化时（如切换交易行），检查当前选中项是否还在列表里
watch(() => props.symbols, (syms) => {
  if (!syms.includes(selectedSymbol.value)) {
    selectedSymbol.value = syms[0] ?? '' // 当前选中不在新列表，切到第一个
  }
})

// K线周期选项配置
const intervals: { value: CandleInterval; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
]

/**
 * 同时 emit 三个更新事件 + refresh。
 * 切换币种或周期后立即触发数据刷新。
 * 这样做是一次性把所有相关状态变更打包通知父组件。
 */
function emitAll() {
  emit('update:symbol', selectedSymbol.value)
  emit('update:interval', selectedInterval.value)
  emit('refresh')
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <!-- 交易行选择 -->
      <div class="control-group">
        <label>{{ t('toolbar.exchange') }}</label>
        <ExchangeSelector
          :modelValue="activeExchangeId ?? ''"
          :exchanges="exchanges"
          @update:modelValue="emit('update:exchange', $event)"
        />
      </div>

      <!-- 交易对选择（带搜索） -->
      <div class="control-group">
        <label>{{ t('toolbar.symbol') }}</label>
        <CoinSelector
          :modelValue="selectedSymbol"
          :symbols="symbols"
          @update:modelValue="selectedSymbol = $event; emitAll()"
        />
      </div>

      <!-- 周期按钮组 -->
      <div class="control-group">
        <label>{{ t('toolbar.interval') }}</label>
        <div class="interval-selector">
          <button
            v-for="iv in intervals"
            :key="iv.value"
            :class="{ active: selectedInterval === iv.value }"
            @click="selectedInterval = iv.value; emitAll()"
          >
            {{ iv.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 中间区域：外部插槽（WebSocket 状态指示灯） -->
    <div class="toolbar-center">
      <slot name="extra" />
    </div>

    <!-- 右侧刷新按钮 -->
    <div class="toolbar-right">
      <button class="btn-refresh" @click="emitAll()">{{ t('toolbar.refresh') }}</button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--toolbar-border);
  gap: 12px;
  flex-wrap: wrap; /* 窗口太窄时自动换行 */
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.toolbar-center {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
}
.control-group { display: flex; align-items: center; gap: 8px; }

.control-group label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control-group select {
  padding: 6px 10px;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  outline: none;
}
.control-group select:focus { border-color: var(--accent-primary); }

/* 周期按钮组：连成一片的 button bar */
.interval-selector { display: flex; gap: 2px; }
.interval-selector button {
  padding: 5px 10px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  font-size: 12px;
  cursor: pointer;
  border-radius: 0;         /* 中间按钮不要圆角 */
  transition: all 0.15s;
}
.interval-selector button:first-child { border-radius: 6px 0 0 6px; }  /* 首尾按钮加圆角 */
.interval-selector button:last-child  { border-radius: 0 6px 6px 0; }
.interval-selector button.active {
  background: var(--accent-primary);
  color: #fff;
  border-color: var(--accent-primary);
}

.btn-refresh {
  padding: 7px 18px;
  background: var(--accent-primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-refresh:hover { background: var(--accent-hover); }
</style>
