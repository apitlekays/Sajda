// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{AppHandle, Emitter};

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

// Modules
mod audio;
mod jakim_api;
mod prayer_engine;
mod scheduler;
mod settings;

use prayer_engine::PrayerEngine;

#[tauri::command]
fn update_coordinates(app: tauri::AppHandle, lat: f64, lng: f64) {
    let engine = app.state::<PrayerEngine>();
    // 1. Update Coords Immediately (for fallback)
    engine.update_coordinates(lat, lng);
    println!("Rust: Coordinates updated to {}, {}", lat, lng);

    // Always emit schedule update after coordinate change.
    // For JAKIM method: triggers cache lookup; if cache is stale, API fetch follows below.
    // For other methods: recalculates prayer times using the new coordinates.
    if let Some(schedule) = engine.get_today_schedule() {
        let _ = app.emit("prayers-refreshed", &schedule);
    }

    // 2. Check/Fetch API
    if engine.needs_refetch(lat, lng) {
        println!("Rust: Spawning API fetch task...");
        let handle = app.clone();
        tauri::async_runtime::spawn(async move {
            match jakim_api::fetch_jakim_times(lat, lng).await {
                Ok(data) => {
                    println!("Rust: API Success for Zone: {}", data.zone);
                    // 1. Save to Disk
                    let _ = jakim_api::save_cache(&handle, lat, lng, &data);

                    // 2. Update In-Memory Cache manually
                    let month_capitalized = format!(
                        "{}{}",
                        data.month.chars().next().unwrap_or_default().to_uppercase(),
                        data.month
                            .chars()
                            .skip(1)
                            .collect::<String>()
                            .to_lowercase()
                    );

                    let mut map = std::collections::HashMap::new();
                    for p in &data.prayers {
                        let key = format!("{:02}-{}-{}", p.day, month_capitalized, data.year);
                        //  println!("Rust: Debug Key Insert: {}", key); // Spammy
                        map.insert(key, p.clone());
                    }

                    let month_hash = format!("{}-{}", month_capitalized, data.year);

                    let new_cache = jakim_api::JakimCache {
                        zone: data.zone,
                        lat,
                        lng,
                        month_hash,
                        prayers: map,
                    };

                    let engine = handle.state::<PrayerEngine>();
                    engine.update_cache(new_cache);

                    // 3. Notify Frontend to Refresh
                    if let Some(schedule) = engine.get_today_schedule() {
                        println!(
                            "Rust: Got Schedule from Engine. Source: {}, Zone: {}",
                            schedule.source, schedule.zone_name
                        );
                        let _ = handle.emit("prayers-refreshed", &schedule);
                        println!("Rust: Emitted 'prayers-refreshed'");
                    } else {
                        println!("Rust: get_today_schedule returned None!");
                    }
                }
                Err(e) => println!("Rust: API Error: {}", e),
            }
        });
    }
}

#[tauri::command]
fn update_calculation_method(app: tauri::AppHandle, method: String) {
    let engine = app.state::<PrayerEngine>();
    engine.set_method(&method);

    // Force refresh frontend with new calculated times
    if let Some(schedule) = engine.get_today_schedule() {
        let _ = app.emit("prayers-refreshed", &schedule);
    }
}

#[tauri::command]
fn get_prayers(app: tauri::AppHandle) -> Option<prayer_engine::PrayerSchedule> {
    let engine = app.state::<PrayerEngine>();
    engine.get_today_schedule()
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

use tauri_plugin_notification::NotificationExt;

#[tauri::command]
async fn debug_delayed_notification(app: tauri::AppHandle, delay_millis: u64) {
    println!("Rust: Waiting {}ms to send notification...", delay_millis);
    tokio::time::sleep(std::time::Duration::from_millis(delay_millis)).await;

    println!("Rust: Sending Debug Notification...");
    let _ = app
        .notification()
        .builder()
        .title("Test Notification (Delayed)")
        .body("Click me! Did the window wake up?")
        .sound("Glass")
        .show();
}

use std::sync::Mutex;
use std::time::Instant;
use tauri::Listener;
use tauri::Manager;
use tauri_plugin_positioner::{Position, WindowExt};

struct TrayState {
    last_show: Mutex<Option<Instant>>,
    last_hide: Mutex<Option<Instant>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize Engine
            app.manage(PrayerEngine::new(app.handle()));
            // Start Ticker
            scheduler::start_ticker(app.handle().clone());

            // Initial Activation Policy Delay and Zones Fetch
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Fetch Zones
                match jakim_api::fetch_zones().await {
                    Ok(zones) => {
                        let _ = jakim_api::save_zones_cache(&handle, &zones);
                        let mut map = std::collections::HashMap::new();
                        for z in zones {
                            map.insert(z.jakim_code.clone(), z);
                        }
                        let engine = handle.state::<PrayerEngine>();
                        engine.update_zones(map);
                    }
                    Err(e) => println!("Rust: Failed to fetch zones: {}", e),
                }

                std::thread::sleep(std::time::Duration::from_millis(500));
                #[cfg(target_os = "macos")]
                let _ = handle.set_activation_policy(tauri::ActivationPolicy::Accessory);
                println!("Rust: Msg - Switched to Accessory Mode after startup");
            });

            let _handle = app.handle().clone();

            // Initialize System Tray
            // Load specific menubar icon (icon.png)
            let icon_bytes = include_bytes!("../icons/icon.png");
            let icon_img = image::load_from_memory(icon_bytes).expect("failed to decode tray icon");
            let (width, height) = (icon_img.width(), icon_img.height());
            let rgba = icon_img.into_rgba8().into_raw();
            let tray_icon = tauri::image::Image::new(&rgba, width, height);

            let _tray = tauri::tray::TrayIconBuilder::with_id("main")
                .icon(tray_icon)
                .icon_as_template(true)
                .title("Sajda")
                .on_tray_icon_event(move |tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Down,
                        ..
                    } = event
                    {
                        // Stop any playing athan/audio immediately
                        let audio = tray.app_handle().state::<Option<audio::AudioState>>();
                        if let Some(audio_state) = audio.as_ref() {
                            if let Ok(sink) = audio_state.sink.lock() {
                                if !sink.empty() {
                                    sink.stop();
                                    println!("Rust: Audio stopped via tray click");
                                }
                            }
                        }

                        let window = tray.app_handle().get_webview_window("main").unwrap();
                        let state = tray.app_handle().state::<TrayState>();

                        let _ = window.move_window(Position::TrayCenter);

                        if window.is_visible().unwrap_or(false) {
                            // HIDE LOGIC
                            let _ = window.hide();
                            // Revert policy if hiding
                            #[cfg(target_os = "macos")]
                            let _ = tray
                                .app_handle()
                                .set_activation_policy(tauri::ActivationPolicy::Accessory);

                            *state.last_hide.lock().unwrap() = Some(Instant::now());
                        } else {
                            // SHOW LOGIC
                            // Temporarily Regular to allow focus
                            #[cfg(target_os = "macos")]
                            let _ = tray
                                .app_handle()
                                .set_activation_policy(tauri::ActivationPolicy::Regular);

                            let _ = window.show();
                            let _ = window.set_focus();
                            *state.last_show.lock().unwrap() = Some(Instant::now());
                        }
                    }
                })
                .build(app)?;

            // LISTENERS FOR NOTIFICATION CLICKS
            // Multiple event names are listened because Tauri notification plugin may emit on different channels
            // across platforms/versions. We consolidate the logic into a helper function.
            fn handle_notification_click(app: &AppHandle, channel: &str) {
                println!("Rust: Notification Clicked ({})", channel);
                if let Some(window) = app.get_webview_window("main") {
                    #[cfg(target_os = "macos")]
                    let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

                    let _ = window.move_window(Position::TrayCenter);
                    let _ = window.set_always_on_top(true);
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            let handle_clone = app.handle().clone();
            app.listen_any("notification-click", move |_| {
                handle_notification_click(&handle_clone, "notification-click");
            });

            let handle_clone2 = app.handle().clone();
            app.listen_any("notification_click", move |_| {
                handle_notification_click(&handle_clone2, "notification_click");
            });

            let handle_clone3 = app.handle().clone();
            app.listen_any("plugin:notification:action", move |_| {
                handle_notification_click(&handle_clone3, "plugin:notification:action");
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(focused) = event {
                if *focused {
                    // CRITICAL FIX: If window receives focus ensure it is visible!
                    #[cfg(target_os = "macos")]
                    let _ = window
                        .app_handle()
                        .set_activation_policy(tauri::ActivationPolicy::Regular);

                    let _ = window.show();

                    let state = window.app_handle().state::<TrayState>();
                    *state.last_show.lock().unwrap() = Some(Instant::now());
                } else {
                    let state = window.app_handle().state::<TrayState>();
                    // Debounce
                    let last_show = *state.last_show.lock().unwrap();
                    if let Some(time) = last_show {
                        if time.elapsed().as_millis() < 250 {
                            return;
                        }
                    }

                    let _ = window.hide();

                    // REVERT TO ACCESSORY MODE ON HIDE
                    #[cfg(target_os = "macos")]
                    let _ = window
                        .app_handle()
                        .set_activation_policy(tauri::ActivationPolicy::Accessory);

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
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let window = app.get_webview_window("main").expect("no main window");

            // Activate as Regular App to steal focus
            #[cfg(target_os = "macos")]
            let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

            let _ = window.move_window(Position::TrayCenter);
            let _ = window.set_always_on_top(true);
            let _ = window.show();
            let _ = window.set_focus();
        }))
        .manage(audio::AudioState::try_new())
        .manage(TrayState {
            last_show: Mutex::new(None),
            last_hide: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            update_tray_title,
            update_coordinates,
            update_calculation_method,
            get_prayers,
            quit_app,
            audio::play_audio_file,
            audio::stop_audio,
            debug_delayed_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
