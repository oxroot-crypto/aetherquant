<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Rating } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  rating: Rating
  score: number
}>()

const ratingClass = computed(() => `badge-${props.rating}`)

const ratingI18nKey: Record<Rating, string> = {
  bullish: 'rating.bullish',
  slightly_bullish: 'rating.slightly_bullish',
  neutral: 'rating.neutral',
  slightly_bearish: 'rating.slightly_bearish',
  bearish: 'rating.bearish',
}

const label = computed(() => t(ratingI18nKey[props.rating]))

const color = computed(() => {
  switch (props.rating) {
    case 'bullish': return '#00c853'
    case 'slightly_bullish': return '#69f0ae'
    case 'neutral': return '#ffd740'
    case 'slightly_bearish': return '#ff6e40'
    case 'bearish': return '#ff1744'
  }
})
</script>

<template>
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
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid;
  white-space: nowrap;
}
.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
