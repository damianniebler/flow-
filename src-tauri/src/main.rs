#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter};
use tauri_plugin_deep_link::DeepLinkExt;

#[derive(Clone, serde::Serialize)]
struct AuthCallbackPayload {
    url: String,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(url) = argv.get(1) {
                if url.starts_with("flowscend://") {
                    if let Some(window) = app.get_webview_window("main") {
                        window.emit("auth-callback", AuthCallbackPayload { url: url.clone() }).unwrap();
                        window.set_focus().unwrap();
                    }
                }
            }
        }))
        .setup(|app| {
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let url = event.urls().get(0).unwrap().to_string();
                if let Some(window) = handle.get_webview_window("main") {
                    window.emit("auth-callback", AuthCallbackPayload { url }).unwrap();
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // This closure is intentionally left empty.
            // We're using the single instance plugin to handle new instances.
        });
}