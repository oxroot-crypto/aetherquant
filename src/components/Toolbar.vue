<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CoinSelector from '@/components/CoinSelector.vue'
import type { CandleInterval } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  symbols: string[]
  sources: { id: string; name: string }[]
  activeSourceId: string | null
}>()

const emit = defineEmits<{
  'update:symbol': [symbol: string]
  'update:interval': [interval: CandleInterval]
  'update:limit': [limit: number]
  'update:source': [sourceId: string]
  refresh: []
}>()

const selectedSymbol = ref(props.symbols[0] ?? '')
const selectedInterval = ref<CandleInterval>('1h')
const selectedLimit = ref(200)

const limits = [50, 100, 200, 300, 500]

watch(() => props.symbols, (syms) => {
  if (!syms.includes(selectedSymbol.value)) {
    selectedSymbol.value = syms[0] ?? ''
  }
})

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

function emitAll() {
  emit('update:symbol', selectedSymbol.value)
  emit('update:interval', selectedInterval.value)
  emit('update:limit', selectedLimit.value)
  emit('refresh')
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="control-group">
        <label>{{ t('toolbar.source') }}</label>
        <select
          :value="activeSourceId"
          @change="emit('update:source', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="s in sources" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div class="control-group">
        <label>{{ t('toolbar.symbol') }}</label>
        <CoinSelector
          :modelValue="selectedSymbol"
          :symbols="symbols"
          @update:modelValue="selectedSymbol = $event; emitAll()"
        />
      </div>
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
      <div class="control-group">
        <label>{{ t('toolbar.candles') }}</label>
        <select :value="selectedLimit" @change="selectedLimit = Number(($event.target as HTMLSelectElement).value); emitAll()">
          <option v-for="n in limits" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
    </div>
    <div class="toolbar-center">
      <slot name="extra" />
    </div>
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
  flex-wrap: wrap;
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
.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
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
.control-group select:focus {
  border-color: var(--accent-primary);
}
.interval-selector {
  display: flex;
  gap: 2px;
}
.interval-selector button {
  padding: 5px 10px;
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  font-size: 12px;
  cursor: pointer;
  border-radius: 0;
  transition: all 0.15s;
}
.interval-selector button:first-child {
  border-radius: 6px 0 0 6px;
}
.interval-selector button:last-child {
  border-radius: 0 6px 6px 0;
}
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
.btn-refresh:hover {
  background: var(--accent-hover);
}
</style>
