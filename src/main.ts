/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * Vue 应用个入口文件。该只文件做三件事：创 Vue 实例、挂 i18n 国际化、
 * 把 App.vue 根组件怼到 #app 里头去。冇用到 vue-router——该下还是单页应用，
 * 冇必要上路由。
 */

import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'
import './style.css' // 全局样式 + 主题变量

// 创建 Vue 应用实例，挂载 i18n 插件
const app = createApp(App)
app.use(i18n)
app.mount('#app')
