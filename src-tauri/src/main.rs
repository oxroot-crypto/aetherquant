//! AetherQuant — 加密货币 K线量化分析平台
//!
//! 开源许可：MIT
//! 代码仓：  https://github.com/oxroot-crypto/aetherquant
//! 作者：   oxroot
//!
//! Rust 入口——Windows 上 Release 构建不弹 cmd 黑框。
//! windows_subsystem = "windows" 让编译出个 exe 双击就开窗口，
//! 不消后台多一只控制台。main 里除哩调 lib.rs 个 run() 冇别个事。
//!
//! 注意：Prevents additional console window... 个注释不删得，
//! Tauri 脚手架自动生成个，删吥可能影响后续升级检测。

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  // 实际启动逻辑委托给 lib.rs 的 run() 函数
  aetherquant_lib::run();
}
