<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./src/assets/icon.svg">
    <img alt="AetherQuant" src="./src/assets/icon.svg" width="96" />
  </picture>
</p>

<h1 align="center">AetherQuant</h1>

<p align="center">
  <a href="https://github.com/oxroot-crypto/aetherquant/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  </a>
  <a href="https://vuejs.org">
    <img src="https://img.shields.io/badge/vue-3.x-4fc08d?logo=vue.js" alt="Vue 3" />
  </a>
  <a href="https://www.typescriptlang.org">
    <img src="https://img.shields.io/badge/TypeScript-6.x-3178c6?logo=typescript" alt="TypeScript" />
  </a>
  <a href="https://v2.tauri.app">
    <img src="https://img.shields.io/badge/Tauri-2.x-ffc131?logo=tauri" alt="Tauri 2" />
  </a>
  <a href="https://vite.dev">
    <img src="https://img.shields.io/badge/Vite-8.x-646cff?logo=vite" alt="Vite" />
  </a>
  <a href="https://hyperliquid.xyz">
    <img src="https://img.shields.io/badge/data-Hyperliquid-6c3fa0" alt="Hyperliquid" />
  </a>
</p>

<p align="center">
  <strong>加密货币 K 线量化分析平台</strong>
  <br />
  <sub>实时行情 · 插件驱动 · 跨平台桌面应用</sub>
</p>

<p align="center">
  <a href="#功能特性"><strong>功能特性</strong></a> ·
  <a href="#快速开始"><strong>快速开始</strong></a> ·
  <a href="#架构"><strong>架构</strong></a> ·
  <a href="#插件系统"><strong>插件系统</strong></a> ·
  <a href="#贡献者"><strong>贡献者</strong></a>
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <strong>简体中文</strong>
</p>

---

## 概述

AetherQuant 是一款桌面级加密货币技术分析工作站。它通过交互式 K 线图表渲染行情，并行运行五种独立的量化策略，并将输出聚合为统一的共识评级 — 所有数据均通过持久化 WebSocket 连接从 Hyperliquid DEX 实时获取。

整个系统采用插件驱动架构：更换数据源即可对接不同交易所，或在不修改核心代码的情况下接入自定义策略模块。

## 功能特性

<table>
  <tr>
    <td width="50%">
      <h4>图表</h4>
      <ul>
        <li>TradingView <code>lightweight-charts</code> 渲染引擎</li>
        <li>K 线 + 成交量双面板布局</li>
        <li>均线指标叠加（MA7 / MA25）</li>
        <li>十字光标悬浮图例（OHLC + 涨跌幅）</li>
        <li>键盘快捷键 — <kbd>R</kbd> 重置，<kbd>+</kbd>/<kbd>-</kbd> 缩放，<kbd>&larr;</kbd><kbd>&rarr;</kbd> 平移，<kbd>F</kbd> 适应</li>
        <li>K 线数量可调（50 – 500）</li>
        <li>默认显示最近 60 根 K 线</li>
      </ul>
    </td>
    <td width="50%">
      <h4>量化引擎</h4>
      <ul>
        <li><b>均线交叉</b> — 金叉 / 死叉检测（MA7 & MA25）</li>
        <li><b>MACD</b> — 动量与信号线交叉（12, 26, 9）</li>
        <li><b>RSI</b> — 超买超卖振荡器（14）</li>
        <li><b>布林带</b> — 波动率与挤压检测（20, 2）</li>
        <li><b>EMA 多周期</b> — 多时间框架趋势对齐（9, 21, 50）</li>
      </ul>
      <p>每种策略输出 0–100 评分，映射到五级评级。</p>
    </td>
  </tr>
  <tr>
    <td>
      <h4>数据管道</h4>
      <ul>
        <li>Hyperliquid <code>POST /info</code> K 线快照</li>
        <li>持久化 WebSocket（<code>wss://api.hyperliquid.xyz/ws</code>）</li>
        <li>单连接生命周期 — 切换币对/周期时先取消再重新订阅</li>
        <li>断线自动重连并重新订阅</li>
        <li>通过 <code>meta</code> 端点获取全量币种（100+ 交易对）</li>
      </ul>
    </td>
    <td>
      <h4>界面 / 交互</h4>
      <ul>
        <li>无边框自定义标题栏 + 窗口控制按钮</li>
        <li>深色 / 浅色主题（CSS 变量驱动，偏好持久化）</li>
        <li>可搜索交易对选择器，实时过滤</li>
        <li>中英文国际化，标题栏下拉切换</li>
        <li>工具栏实时连接状态指示器</li>
        <li>响应式布局 — 图表 + 可折叠侧边栏</li>
      </ul>
    </td>
  </tr>
</table>

### 评分模型

| 评分 | 评级 | 含义 |
| ----: | :--- | :--- |
| 70 – 100 | 强烈看多 | 买入信号 |
| 55 – 70 | 看多 | 偏多 |
| 45 – 55 | 中性 | 观望 |
| 30 – 45 | 看空 | 偏空 |
| 0 – 30 | 强烈看空 | 卖出信号 |

共识评分为所有已激活策略评分的算术平均值。

## 技术栈

| 层级 | 技术 |
| :--- | :--- |
| UI 框架 | Vue 3（Composition API，`<script setup>`） |
| 语言 | TypeScript（严格模式） |
| 图表 | `lightweight-charts` v5（TradingView） |
| 国际化 | `vue-i18n` v10 |
| 样式 | CSS 自定义属性（深色 / 浅色主题） |
| 构建 | Vite 8 |
| 桌面壳 | Tauri 2（Rust 后端） |
| 行情数据 | Hyperliquid DEX（HTTP + WebSocket） |

## 快速开始

```bash
# 前提条件：Node.js ≥ 18，Rust 工具链

# 浏览器开发
npm install
npm run dev                # http://localhost:5173

# 桌面应用开发
npm run tauri:dev

# 生产构建
npm run tauri:build        # → src-tauri/target/release/bundle/
```

> **Windows：** Rust 后端需要 MSVC 构建工具和 Windows SDK。

## 架构

```
src/
├── components/          Vue 3 单文件组件
│   ├── TitleBar.vue     自定义无边框标题栏 + 窗口控制
│   ├── Toolbar.vue      交易对 / 周期 / K 线数选择器 + WS 指示器
│   ├── CoinSelector.vue 可搜索下拉选择器（100+ 交易对，实时过滤）
│   ├── KlineChart.vue   K 线 + 成交量 + 均线叠加 + 悬浮图例
│   ├── AnalysisPanel.vue 策略卡片（评分、信号、指标）
│   └── RatingBadge.vue  彩色评级标签
├── composables/         逻辑 Hooks
│   ├── useChart.ts      lightweight-charts 生命周期与指标 API
│   ├── useRealtime.ts   Hyperliquid 持久化 WebSocket 管理器
│   ├── useAnalysis.ts   策略执行管道
│   ├── useTheme.ts      深色/浅色主题切换 + 持久化
│   ├── useTauri.ts      原生窗口 API 抽象
│   └── usePlugins.ts    响应式插件状态
├── plugin-system/
│   └── PluginManager.ts 插件注册、激活、发布/订阅
├── plugins/
│   ├── data-sources/
│   │   └── hyperliquid-source.ts
│   └── strategies/
│       ├── ma-strategy.ts      均线交叉
│       ├── macd-strategy.ts    MACD
│       ├── rsi-strategy.ts     RSI
│       ├── bollinger-strategy.ts 布林带
│       └── ema-strategy.ts     EMA 多周期
├── locales/             zh.ts / en.ts
├── types/               TypeScript 共享接口
├── themes.css           CSS 变量定义（深色 + 浅色）
├── App.vue              根组件 — 数据调度、WS 生命周期
├── i18n.ts              i18n 实例与语言持久化
└── main.ts              入口

src-tauri/               Tauri (Rust) 后端
├── src/                 lib.rs、main.rs
├── icons/               应用图标（ico、icns、png）
├── Cargo.toml
└── tauri.conf.json      窗口配置（无边框，1400×900）
```

### 数据流

```
HTTP fetchData  ──→  data[]  ──→  KlineChart.setData()
                                      │
WS onCandle  ──→  merge  ──→  data[] ──→  KlineChart.setData()
                                      │
                                      ├──  plotIndicators()  （均线叠加）
                                      └──  run(slice)        （量化分析）
```

### WebSocket 生命周期

```
connect(BTC, 1h)
  ├── 取消旧订阅（如有）
  ├── subscribe { candle, BTC, 1h }
  │
  ├── onmessage → Number() 转换 → 按 coin/interval 过滤 → onCandle()
  │
  ├── 切换至 (ETH, 15m)
  │     ├── unsubscribe { candle, BTC, 1h }
  │     └── subscribe   { candle, ETH, 15m }
  │         （同一 WebSocket，无需重连）
  │
  └── onclose → 3 秒后重连 → onopen → 重新订阅当前币对周期
```

## 插件系统

插件通过类型化接口实现，向 `PluginManager` 注册。宿主应用不直接导入插件内部实现 — 仅通过管理器进行通信。

### 策略插件

```ts
import type { StrategyPlugin } from '@/types'

export const myStrategy: StrategyPlugin = {
  id: 'my-strategy',
  name: '我的策略',
  version: '1.0.0',
  type: 'strategy',
  description: '策略描述',
  analyze(data) {
    return {
      strategyId: 'my-strategy',
      strategyName: '我的策略',
      rating: 'bullish',       // 'bearish' | 'slightly_bearish' | 'neutral' | ...
      score: 75,                // 0 – 100
      signals: [{ type: 'buy', message: '信号文本', timestamp: Date.now() }],
      indicators: [{ name: '指标名', value: 1.23, displayValue: '1.23' }],
      summary: '分析结论',
      timestamp: Date.now(),
    }
  },
}

// 激活
pluginManager.registerStrategy(myStrategy)
```

### 数据源插件

```ts
import type { DataSourcePlugin } from '@/types'

export const mySource: DataSourcePlugin = {
  id: 'my-source',
  name: '我的交易所',
  version: '1.0.0',
  type: 'data-source',
  description: '自定义交易所适配器',
  async fetchData(symbol, interval, limit) { /* → OHLCV[] */ },
  async fetchRange?(symbol, interval, start, end) { /* → OHLCV[] */ },
  getSupportedSymbols() { return ['BTC/USDT', 'ETH/USDT'] },
  getSupportedIntervals() { return ['1m', '5m', '15m', '1h', '4h', '1d'] },
}

pluginManager.registerDataSource(mySource)
pluginManager.setActiveDataSource('my-source')
```

## 贡献者

<table>
  <tr>
    <td align="center">
      <strong>oxroot</strong><br />
      <sub>项目作者</sub><br />
      <sub>架构设计 · 策略算法 · 方向规划</sub>
    </td>
    <td align="center">
      <strong>Claude Code</strong><br />
      <sub>工程实现</sub><br />
      <sub>全栈开发 · UI/UX 设计 · 工程化</sub>
    </td>
  </tr>
</table>

## 许可证

MIT © 2025 oxroot。完整文本见 [LICENSE](./LICENSE)。
