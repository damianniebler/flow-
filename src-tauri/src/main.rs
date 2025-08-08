#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;
use std::sync::{Arc, Mutex};
use url::Url;

#[derive(Clone, serde::Serialize)]
struct EventPayload {
    title: String,
}

#[derive(Clone, serde::Serialize)]
struct AuthCallbackPayload {
    url: String,
}

// Store the last deep link so the frontend can fetch it after it reloads
type DeepLinkInner = Arc<Mutex<Option<String>>>;
struct DeepLinkStore(DeepLinkInner);
impl DeepLinkStore {
    fn new() -> Self {
        Self(Arc::new(Mutex::new(None)))
    }
}

#[tauri::command]
fn flash_taskbar(app: tauri::AppHandle, title: String) {
    println!("[Rust] The 'flash_taskbar' command was invoked for event: {}", &title);
    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{
                FLASHWINFO, FlashWindowEx, FLASHW_ALL, FLASHW_TIMERNOFG,
            };
            if let Ok(raw_handle) = window.hwnd() {
                unsafe {
                    let hwnd = HWND(raw_handle.0 as *mut std::ffi::c_void);
                    let flash_info = FLASHWINFO {
                        cbSize: std::mem::size_of::<FLASHWINFO>() as u32,
                        hwnd,
                        dwFlags: FLASHW_ALL | FLASHW_TIMERNOFG,
                        uCount: 0,
                        dwTimeout: 0,
                    };
                    FlashWindowEx(&flash_info);
                }
            }
        }
        let _ = window.emit("event-starting-soon", EventPayload { title });
    } else {
        println!("[Rust] FAILED to get main window.");
    }
}

#[tauri::command]
fn take_pending_deep_link(store: tauri::State<DeepLinkStore>) -> Option<String> {
    store.0.lock().unwrap().take()
}

fn main() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            println!("single-instance: new process argv = {argv:?}");
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Make the deep link store available to commands and handlers
            app.manage(DeepLinkStore::new());

            #[cfg(any(windows, target_os = "linux"))]
            {
                app.deep_link().register_all()?;
            }

            // Pull a 'static Arc out of State, don't move State itself.
            let store_arc: DeepLinkInner = {
                let state: tauri::State<DeepLinkStore> = app.state();
                state.0.clone()
            };

            // Use cloned AppHandle(s) — never capture `app` in the closure.
            let handle_for_listener = app.handle().clone(); // for .deep_link()
            let handle_for_closure  = app.handle().clone(); // used inside the callback

            handle_for_listener.deep_link().on_open_url(move |event| {
                if let Some(url) = event.urls().get(0) {
                    let url_str = url.to_string();
                    println!("[Rust] Deep link opened: {}", url_str);

                    // Save it so the frontend can fetch it after it reloads
                    *store_arc.lock().unwrap() = Some(url_str.clone());

                    if let Some(window) = handle_for_closure.get_webview_window("main") {
                        // Don't navigate the webview here. For some systems (notably Windows
                        // with WebView2), programmatic navigation immediately after a deep-link
                        // can cause the webview to stop tracking window resize events, leaving a
                        // small white content area with a large black border. Instead, just emit
                        // the event and let the frontend handle any reload/navigation it needs.
                        let _ = window.set_focus();
                        let _ = window.emit("auth-callback", AuthCallbackPayload { url: url_str });
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            flash_taskbar,
            take_pending_deep_link
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
