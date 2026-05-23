<script setup lang="ts">
/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 评级徽章——一只小巧个胶囊形标签。颜色跟评级走：
 * 绿（bullish）→ 浅绿（slightly_bullish）→ 黄（neutral）
 * → 橙（slightly_bearish）→ 红（bearish）。
 * 背景是前景色加 22 hex alpha（约 13% 不透明度），
 * 边框同文字同色，前头一粒小圆点。显示评级名 + 数值分数。
 * 用法：<RatingBadge :rating="'bullish'" :score="85" />
 */

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Rating } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  rating: Rating
  score: number
}>()

/** CSS class 名：badge-bullish / badge-slightly_bullish / ... */
const ratingClass = computed(() => `badge-${props.rating}`)

/** 评级 → i18n key 对照表 */
const ratingI18nKey: Record<Rating, string> = {
  bullish: 'rating.bullish',
  slightly_bullish: 'rating.slightly_bullish',
  neutral: 'rating.neutral',
  slightly_bearish: 'rating.slightly_bearish',
  bearish: 'rating.bearish',
}

/** 翻译后个评级标签文字 */
const label = computed(() => t(ratingI18nKey[props.rating]))

/**
 * 根据评级档位返回对应颜色。
 * 颜色选择逻辑：越看多越绿，越看空越红，中性黄色。
 */
const color = computed(() => {
  switch (props.rating) {
    case 'bullish': return '#00c853'           // 亮绿
    case 'slightly_bullish': return '#69f0ae'  // 浅绿
    case 'neutral': return '#ffd740'            // 琥珀黄
    case 'slightly_bearish': return '#ff6e40'   // 浅红/橙
    case 'bearish': return '#ff1744'            // 亮红
  }
})
</script>

<template>
  <!-- 背景用 color + 22 (hex alpha ≈ 13% opacity) —— 淡色底 + 深色文字同边框 -->
  <span
    class="rating-badge"
    :class="ratingClass"
    :style="{ backgroundColor: color + '22', borderColor: color, color }"
  >
    <span class="badge-dot" :style="{ backgroundColor: color }"></span>
    {{ label }} {{ score }}
  </span>
</template>

<style scoped>
.rating-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;       /* 胶囊形 */
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid;
  white-space: nowrap;       /* 不换行，保持紧凑 */
}
.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;        /* 小圆点，跟评级同色 */
}
</style>
