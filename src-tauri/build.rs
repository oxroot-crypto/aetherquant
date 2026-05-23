//! AetherQuant — 加密货币 K线量化分析平台
//!
//! 开源许可：MIT  /  代码仓：https://github.com/oxroot-crypto/aetherquant  /  作者：oxroot
//!
//! Cargo 构建脚本——cargo build 之前跑，给 Tauri 生成运行时配置。
//! tauri_build::build() 读 tauri.conf.json 生成 struct、
//! 设重编译条件（配置改了就触发重编）、引用图标等资源。
//! 不复杂，一行宏调用就结哩。

fn main() {
  tauri_build::build()
}
