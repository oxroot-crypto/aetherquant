/**
 * AetherQuant — 加密货币 K线量化分析平台
 *
 * 开源许可：MIT
 * 代码仓：  https://github.com/oxroot-crypto/aetherquant
 * 作者：   oxroot
 *
 * 版本号同步脚本——防发版时间漏改某只文件。跟倒改三件：
 * package.json、src-tauri/Cargo.toml、src-tauri/tauri.conf.json。
 *
 * 用法：node scripts/sync-version.cjs [版本号]
 *   冇参数：打印各文件当前版本
 *   有参数：更新全部文件到新版（格式 x.y.z 或 x.y.z-tag）
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

// 语义化版本号格式校验正则
const VERSION_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/
// 匹配 Cargo.toml 里的 version = "x.y.z"
const CARGO_RE = /^version\s*=\s*"([^"]+)"/m
// 匹配 tauri.conf.json 里的 "version": "x.y.z"
// 注意：正则只会匹配顶层的 "version" 字段，不会误改 dependencies 里头的版本号

/** 文件同步配置表：每个文件定义 read/getVer/updater 三个操作 */
const files = [
  {
    name: 'package.json',
    read: p => require(path.join(root, p)),
    updater: (content) => {
      const pkg = JSON.parse(content)
      pkg.version = ver
      return JSON.stringify(pkg, null, 2) + '\n'  // 保持 JSON 格式：2 空格缩进 + 末尾换行
    },
    getVer: pkg => pkg.version,
  },
  {
    name: 'src-tauri/Cargo.toml',
    read: p => fs.readFileSync(path.join(root, p), 'utf-8'),
    updater: (content) => content.replace(CARGO_RE, `version = "${ver}"`),
    getVer: content => {
      const m = content.match(CARGO_RE)
      return m ? m[1] : 'unknown'
    },
  },
  {
    name: 'src-tauri/tauri.conf.json',
    read: p => require(path.join(root, p)),
    updater: (content) => {
      const cfg = JSON.parse(content)
      cfg.version = ver
      return JSON.stringify(cfg, null, 2) + '\n'
    },
    getVer: cfg => cfg.version,
  },
]

const ver = process.argv[2]

if (ver) {
  // ====== 写入模式：更新全部文件版本号 ======
  if (!VERSION_RE.test(ver)) {
    console.error('Invalid version format. Use: x.y.z or x.y.z-tag')
    process.exit(1)
  }

  for (const entry of files) {
    const fpath = path.join(root, entry.name)
    try {
      const content = entry.read(entry.name)
      const raw = typeof content === 'string' ? content : JSON.stringify(content)
      const updated = entry.updater(raw)
      fs.writeFileSync(fpath, updated)
      console.log(`  ${entry.name} → ${ver}`)
    } catch (e) {
      console.error(`  ERROR updating ${entry.name}: ${e.message}`)
      process.exit(1)
    }
  }
  console.log(`Version synced to ${ver}`)
} else {
  // ====== 查询模式：显示当前各文件版本 ======
  for (const entry of files) {
    try {
      const content = entry.read(entry.name)
      const v = entry.getVer(typeof content === 'string' ? content : content)
      console.log(`${entry.name.padEnd(22)} ${v}`)
    } catch (e) {
      console.log(`${entry.name.padEnd(22)} ERROR: ${e.message}`)
    }
  }
}
