import { ref, computed } from 'vue'
import { pluginManager } from '@/plugin-system/PluginManager'
import type { OHLCV, AnalysisResult, Rating } from '@/types'
import { scoreToRating } from '@/utils/indicators'

export function useAnalysis() {
  const results = ref<AnalysisResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const overallRating = computed<{ rating: Rating; score: number }>(() => {
    if (results.value.length === 0) return { rating: 'neutral', score: 50 }
    const avg = results.value.reduce((s, r) => s + r.score, 0) / results.value.length
    return {
      score: Math.round(avg),
      rating: scoreToRating(avg),
    }
  })

  const bullishCount = computed(() => results.value.filter(r => r.rating === 'bullish' || r.rating === 'slightly_bullish').length)
  const bearishCount = computed(() => results.value.filter(r => r.rating === 'bearish' || r.rating === 'slightly_bearish').length)

  async function run(data: OHLCV[]) {
    loading.value = true
    error.value = null
    try {
      results.value = await pluginManager.runAnalysis(data)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Analysis failed'
    } finally {
      loading.value = false
    }
  }

  return {
    results,
    loading,
    error,
    overallRating,
    bullishCount,
    bearishCount,
    run,
  }
}
