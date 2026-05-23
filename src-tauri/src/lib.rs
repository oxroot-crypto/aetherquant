//! AetherQuant — 加密货币 K线量化分析平台
//!
//! 开源许可：MIT
//! 代码仓：  https://github.com/oxroot-crypto/aetherquant
//! 作者：   oxroot
//!
//! Tauri 2 应用构建器。Debug 模式挂 log 插件（Info 级别），
//! generate_context!() 编译时把 tauri.conf.json 嵌进二进制。
//! 前端 Vite 出 dist/，Tauri 用系统 WebView 加载。
//! #[cfg_attr(mobile, ...)] 是给以后移动端留个入口，
//! 该下桌面上走不到那条分支。

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Debug 构建下启用日志插件，方便排查问题
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
