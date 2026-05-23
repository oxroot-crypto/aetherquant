<script setup lang="ts">
/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 交易行下拉选择器。跟 CoinSelector 长得像但更简单——交易行拢共就一两只，
 * 不消搜索功能。每项显示名称 + 描述，激活个打 ✓ 标记。
 * 点外头自动关，clickOutside 事件在 document 上监听。
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string
  exchanges: { id: string; name: string; description: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

/** 当前激活个交易行对象 */
const active = computed(() => props.exchanges.find(e => e.id === props.modelValue))

function select(id: string) {
  emit('update:modelValue', id)
  open.value = false
}

/** 点击组件外部关闭下拉 */
function handleClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="wrapperRef" class="exch-selector">
    <!-- 触发器：显示当前交易行名称 + ▼ -->
    <button class="es-trigger" @click="open = !open" type="button">
      <span class="es-name">{{ active?.name ?? 'Select...' }}</span>
      <span class="es-arrow" :class="{ open }">▾</span>
    </button>

    <!-- 下拉列表 -->
    <div v-if="open" class="es-dropdown">
      <div
        v-for="e in exchanges"
        :key="e.id"
        class="es-item"
        :class="{ active: e.id === modelValue }"
        @click="select(e.id)"
      >
        <div class="es-info">
          <span class="es-name">{{ e.name }}</span>
          <span class="es-desc">{{ e.description }}</span>
        </div>
        <!-- 激活项显示 ✓ -->
        <span v-if="e.id === modelValue" class="es-check">✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exch-selector { position: relative; min-width: 150px; }
.es-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.es-trigger:hover { border-color: var(--border-accent); }
.es-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.es-arrow {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-secondary);
  transition: transform 0.15s;
}
.es-arrow.open { transform: rotate(180deg); }

.es-dropdown {
  position: absolute;
  top: 100%;
  left: 0; right: 0;
  min-width: 260px;
  margin-top: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  overflow: hidden;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.es-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.1s;
}
.es-item:hover { background: var(--bg-card-hover); }
.es-item.active { background: var(--accent-primary); }
.es-item.active .es-name,
.es-item.active .es-desc { color: #fff; }

.es-info { display: flex; flex-direction: column; min-width: 0; }
.es-info .es-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.es-info .es-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }
.es-check { margin-left: auto; color: #fff; font-size: 13px; }
</style>
