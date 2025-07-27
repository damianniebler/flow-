#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn flash_taskbar(window: tauri::Window) {
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
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![flash_taskbar])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}