// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn update_tray_title(app: tauri::AppHandle, title: &str) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_title(Some(title));
    }
}

use std::sync::Mutex;
use std::time::Instant;
use tauri::Manager;
use tauri_plugin_positioner::{Position, WindowExt};

struct TrayState {
    last_show: Mutex<Option<Instant>>,
    last_hide: Mutex<Option<Instant>>,
}

mod audio;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let _handle = app.handle().clone();

            // Initialize System Tray
            let _tray = tauri::tray::TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .title("Sajda")
                .on_tray_icon_event(move |tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Down,
                        ..
                    } = event
                    {
                        let window = tray.app_handle().get_webview_window("main").unwrap();
                        let state = tray.app_handle().state::<TrayState>();

                        let _ = window.move_window(Position::TrayCenter);

                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                            *state.last_hide.lock().unwrap() = Some(Instant::now());
                        } else {
                            // Fix Toggle Loop: If we JUST hid the window (via blur), don't show it again immediately
                            let last_hide = *state.last_hide.lock().unwrap();
                            if let Some(time) = last_hide {
                                if time.elapsed().as_millis() < 250 {
                                    // It was likely hidden by the blur event caused by clicking this tray icon.
                                    // So we treat this as a "close" intent, and do nothing (it's already hidden).
                                    return;
                                }
                            }

                            let _ = window.show();
                            let _ = window.set_focus();
                            *state.last_show.lock().unwrap() = Some(Instant::now());
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(focused) = event {
                if !focused {
                    let state = window.app_handle().state::<TrayState>();
                    // Debounce: If we JUST showed the window, ignore the immediate blur (fixes "hides on mouse up")
                    let last_show = *state.last_show.lock().unwrap();
                    if let Some(time) = last_show {
                        if time.elapsed().as_millis() < 250 {
                            return;
                        }
                    }
                    let _ = window.hide();
                    // Record hide time for the tray toggle logic
                    *state.last_hide.lock().unwrap() = Some(Instant::now());
                }
            }
        })
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_geolocation::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .manage(audio::AudioState::new())
        .manage(TrayState {
            last_show: Mutex::new(None),
            last_hide: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            update_tray_title,
            audio::play_audio_file,
            audio::stop_audio
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
