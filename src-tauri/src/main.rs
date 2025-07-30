#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Add both Manager and Emitter traits to the scope
use tauri::{Manager, Emitter};

// Create a struct to hold the event payload from the frontend
#[derive(Clone, serde::Serialize)]
struct EventPayload {
  title: String,
}

#[tauri::command]
fn flash_taskbar(app: tauri::AppHandle, title: String) {
    println!("[Rust] The 'flash_taskbar' command was invoked for event: {}", &title);

    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{FLASHWINFO, FlashWindowEx, FLASHW_ALL, FLASHW_TIMERNOFG};
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
        
        println!("[Rust] Emitting 'event-starting-soon' event to frontend.");
        window.emit("event-starting-soon", EventPayload { title: title.into() }).unwrap();

    } else {
        println!("[Rust] FAILED to get main window.");
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![flash_taskbar])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}