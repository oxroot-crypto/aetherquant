/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
 *
 * 量化分析 composable——把策略执行同共识计算包到一只函数里头。
 * 调 PluginManager.runAnalysis() 并行跑全部激活个策略，
 * 拿到每支个评分做算术平均得出综合评级，还统计看多/看空票数。
 * 暴露哩 loading/error 两只状态，UI 凭渠显示加载动画或错误提示。
 *
 * 综合评分就是算术平均，蛮简单但实用——每支策略平权投票，
 * 多支共振平均分会自然朝共识方向收敛。
 */

import { ref, computed } from 'vue'
import { pluginManager } from '@/plugin-system/PluginManager'
import type { OHLCV, AnalysisResult, Rating } from '@/types'
import { scoreToRating } from '@/utils/indicators'

export function useAnalysis() {
  // 最新的分析结果列表（每支策略一条）
  const results = ref<AnalysisResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 综合评级（Consensus Rating）。
   * 所有激活策略分数的算术平均，再映射到五档评级。
   * 如果没有分析结果，默认中性 50 分。
   */
  const overallRating = computed<{ rating: Rating; score: number }>(() => {
    if (results.value.length === 0) return { rating: 'neutral', score: 50 }
    const avg = results.value.reduce((s, r) => s + r.score, 0) / results.value.length
    return {
      score: Math.round(avg),
      rating: scoreToRating(avg),
    }
  })

  /** 看多策略数（含 bullish 同 slightly_bullish） */
  const bullishCount = computed(() => results.value.filter(r => r.rating === 'bullish' || r.rating === 'slightly_bullish').length)

  /** 看空策略数（含 bearish 同 slightly_bearish） */
  const bearishCount = computed(() => results.value.filter(r => r.rating === 'bearish' || r.rating === 'slightly_bearish').length)

  /**
   * 执行全部分析。传入 OHLCV 数据，并行调用所有激活策略。
   * loading/error 状态会在过程中更新，UI 可以用 loading 显示分析中动画。
   */
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
    results, loading, error, overallRating, bullishCount, bearishCount, run,
  }
}
