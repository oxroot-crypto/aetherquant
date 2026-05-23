<script setup lang="ts">
/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 带搜索个币种下拉选择器。v-model 双向绑，打开就自动 focus 到搜索框。
 * 交互上有几只讲究：
 * - 输入啥哩就即时过滤列表（大小写不敏感）
 * - 选中哩清空搜索、收拢下拉
 * - blur 推迟 150ms 才收——留时间等 mousedown 先选中
 * - @mousedown.prevent 防止 blur 事件抢在 select 前头触发
 * - 点到组件外头自动关（document click 监听）
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string           // 当前选中值
  symbols: string[]            // 全部交易对列表
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const search = ref('')                    // 搜索关键词
const open = ref(false)                   // 下拉是否展开
const wrapperRef = ref<HTMLElement | null>(null) // 组件根节点引用（clickOutside 检测用）
const inputRef = ref<HTMLInputElement | null>(null)

/** 实时过滤：关键词匹配（大小写不敏感） */
const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return props.symbols           // 冇关键词返回全部
  return props.symbols.filter(s => s.toLowerCase().includes(q))
})

/** 选中一项：emit 更新 v-model，清空搜索，收起下拉 */
function select(s: string) {
  emit('update:modelValue', s)
  search.value = ''
  open.value = false
}

/** 切换下拉开关。打开时聚焦搜索框 */
function toggle() {
  open.value = !open.value
  if (open.value) {
    search.value = ''
    setTimeout(() => inputRef.value?.focus(), 0) // nextTick 保证 DOM 渲染完能 focus
  }
}

/** blur 延迟 150ms 收起，给 click 事件留时间先触发 select() */
function onBlur() {
  setTimeout(() => { open.value = false }, 150)
}

/** 点击组件外部 → 收起下拉 */
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
    <!-- 触发器按钮：显示当前选中 + ▼ 箭头 -->
    <button class="cs-trigger" @click="toggle" type="button">
      <span class="cs-value">{{ modelValue || 'Select...' }}</span>
      <span class="cs-arrow" :class="{ open }">▾</span>
    </button>

    <!-- 下拉面板 -->
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
          @mousedown.prevent="select(s)"  <!-- prevent 防止 blur 先触发 -->
        >
          {{ s }}
        </li>
        <li v-if="filtered.length === 0" class="cs-empty">No results</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.coin-selector { position: relative; min-width: 140px; }
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
.cs-trigger:hover { border-color: var(--border-accent); }
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
.cs-arrow.open { transform: rotate(180deg); } /* 展开时箭头朝上 */

.cs-dropdown {
  position: absolute;
  top: 100%;
  left: 0; right: 0;
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
.cs-search::placeholder { color: var(--text-muted); }
.cs-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  max-height: 220px;
  overflow-y: auto;          /* 列表太长出滚动条 */
}
.cs-item {
  padding: 7px 10px;
  font-size: 13px;
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
}
.cs-item:hover { background: var(--bg-card-hover); }
.cs-item.active { background: var(--accent-primary); color: #fff; }
.cs-empty { padding: 10px; font-size: 12px; color: var(--text-muted); text-align: center; }
</style>
