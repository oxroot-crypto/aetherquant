// Sync version across package.json, Cargo.toml, and tauri.conf.json
// Usage: node scripts/sync-version.cjs [new-version]
//   Without arg: prints current versions
//   With arg:    updates all files to the given version

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

const VERSION_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/
const CARGO_RE = /^version\s*=\s*"([^"]+)"/m
const RSRC_RE = /"version"\s*:\s*"([^"]+)"/

const files = [
  {
    name: 'package.json',
    read: p => require(path.join(root, p)),
    updater: (content) => {
      const pkg = JSON.parse(content)
      pkg.version = ver
      return JSON.stringify(pkg, null, 2) + '\n'
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
  if (!VERSION_RE.test(ver)) {
    console.error('Invalid version format. Use: x.y.z or x.y.z-tag')
    process.exit(1)
  }
  let failed = false
  const restored = []
  for (const entry of files) {
    const fpath = path.join(root, entry.name)
    try {
      const content = entry.read(entry.name)
      const updated = entry.updater(typeof content === 'string' ? content : JSON.stringify(content))
      if (updated !== content) {
        fs.writeFileSync(fpath, updated)
        restored.push(fpath)
      }
      console.log(`  ${entry.name} → ${ver}`)
    } catch (e) {
      failed = true
      console.error(`  ERROR updating ${entry.name}: ${e.message}`)
      break
    }
  }
  if (failed) {
    console.error('Sync failed. Partially updated files may be inconsistent.')
    process.exit(1)
  }
  console.log(`Version synced to ${ver}`)
} else {
  // Print current versions
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
