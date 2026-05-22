<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string
  symbols: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const search = ref('')
const open = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return props.symbols
  return props.symbols.filter(s => s.toLowerCase().includes(q))
})

function select(s: string) {
  emit('update:modelValue', s)
  search.value = ''
  open.value = false
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    search.value = ''
    setTimeout(() => inputRef.value?.focus(), 0)
  }
}

function onBlur() {
  setTimeout(() => { open.value = false }, 150)
}

function handleClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="wrapperRef" class="coin-selector">
    <button class="cs-trigger" @click="toggle" type="button">
      <span class="cs-value">{{ modelValue || 'Select...' }}</span>
      <span class="cs-arrow" :class="{ open }">▾</span>
    </button>
    <div v-if="open" class="cs-dropdown">
      <input
        ref="inputRef"
        v-model="search"
        class="cs-search"
        placeholder="Search..."
        @blur="onBlur"
      />
      <ul class="cs-list">
        <li
          v-for="s in filtered"
          :key="s"
          class="cs-item"
          :class="{ active: s === modelValue }"
          @mousedown.prevent="select(s)"
        >
          {{ s }}
        </li>
        <li v-if="filtered.length === 0" class="cs-empty">No results</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.coin-selector {
  position: relative;
  min-width: 140px;
}
.cs-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 10px;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  gap: 8px;
}
.cs-trigger:hover {
  border-color: var(--border-accent);
}
.cs-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-arrow {
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.15s;
  flex-shrink: 0;
}
.cs-arrow.open {
  transform: rotate(180deg);
}
.cs-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  overflow: hidden;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.cs-search {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg-input);
  color: var(--text-primary);
  border: none;
  border-bottom: 1px solid var(--border-primary);
  font-size: 13px;
  outline: none;
}
.cs-search::placeholder {
  color: var(--text-muted);
}
.cs-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  max-height: 220px;
  overflow-y: auto;
}
.cs-item {
  padding: 7px 10px;
  font-size: 13px;
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
}
.cs-item:hover {
  background: var(--bg-card-hover);
}
.cs-item.active {
  background: var(--accent-primary);
  color: #fff;
}
.cs-empty {
  padding: 10px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}
</style>
