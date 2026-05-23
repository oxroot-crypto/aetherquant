/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * Vite 8 构建配置。挂哩 Vue 3 插件，@ 别名指到 src/，
 * 开发端口固定 5173（Tauri 配哩该只端口）。ignore src-tauri/
 * 因为 Rust 自己编译，Vite 不消监听。clearScreen: false
 * 免得启动时间清掉终端历史。
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],

  // 路径别名：@ → src/，引入文件不用写 ../../../../
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  clearScreen: false, // Tauri dev 模式下不清屏

  server: {
    port: 5173,
    strictPort: true,   // 端口被占用直接报错，不自动换端口
    watch: {
      // 忽略 Rust 源码目录——Cargo 自己会编译，Vite 不用监听
      ignored: ['**/src-tauri/**'],
    },
  },
})
