// Sync version across package.json, Cargo.toml, and tauri.conf.json
// Usage: node scripts/sync-version.cjs [new-version]
//   Without arg: prints current versions
//   With arg:    updates all files to the given version

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const files = {
  'package.json': p => { p.version = ver; return JSON.stringify(p, null, 2) + '\n' },
  'src-tauri/Cargo.toml': c => c.replace(/^version = "[\d.]+"/m, `version = "${ver}"`),
  'src-tauri/tauri.conf.json': c => c.replace(/"version": "[\d.]+"/, `"version": "${ver}"`),
}

const ver = process.argv[2]

if (ver) {
  if (!/^\d+\.\d+\.\d+$/.test(ver)) {
    console.error('Invalid version format. Use: x.y.z')
    process.exit(1)
  }
  for (const [fname, updater] of Object.entries(files)) {
    const fpath = path.join(root, fname)
    const content = fs.readFileSync(fpath, 'utf-8')
    const parsed = fname.endsWith('.json') ? JSON.parse(content) : content
    const updated = updater(parsed)
    fs.writeFileSync(fpath, updated)
    console.log(`  ${fname} → ${ver}`)
  }
  console.log(`Version synced to ${ver}`)
} else {
  // Print current versions
  const pkg = require(path.join(root, 'package.json'))
  const cargo = fs.readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf-8').match(/version = "([\d.]+)"/)[1]
  const tauri = require(path.join(root, 'src-tauri/tauri.conf.json'))
  console.log(`package.json:     ${pkg.version}`)
  console.log(`Cargo.toml:       ${cargo}`)
  console.log(`tauri.conf.json:  ${tauri.version}`)
}
