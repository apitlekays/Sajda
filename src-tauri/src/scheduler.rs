use crate::prayer_engine::PrayerEngine; // Import the struct
use crate::settings;
use chrono::{Datelike, Timelike};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tokio::time::interval;

/// Generate 3 deterministic reminder times for a given date.
/// Uses date components as a seed for a simple LCG.
/// Times are constrained between 08:00 and 21:00 with minimum 90-minute gaps.
fn generate_random_times(year: i32, month: u32, day: u32) -> Vec<String> {
    let seed: u64 = (year as u64).wrapping_mul(10000) + (month as u64 * 100) + day as u64;

    let min_minutes: u32 = 8 * 60; // 08:00
    let max_minutes: u32 = 21 * 60; // 21:00
    let range = max_minutes - min_minutes; // 780 minutes

    let mut state = seed;
    let mut times: Vec<u32> = Vec::new();

    for _ in 0..3 {
        state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        let offset = ((state >> 33) as u32) % range;
        times.push(min_minutes + offset);
    }

    times.sort();

    // Enforce minimum 90-minute gap
    for i in 1..times.len() {
        if times[i] - times[i - 1] < 90 {
            times[i] = (times[i - 1] + 90).min(max_minutes);
        }
    }

    times
        .iter()
        .map(|&m| format!("{:02}:{:02}", m / 60, m % 60))
        .collect()
}

fn to_mono_digits(input: &str) -> String {
    input
        .chars()
        .map(|c| {
            if c.is_ascii_digit() {
                // Mathematical Monospace Digits start at U+1D7F6 for '0'
                // '0' is 0x30
                let digit = c as u32 - 0x30;
                char::from_u32(0x1D7F6 + digit).unwrap_or(c)
            } else {
                c
            }
        })
        .collect()
}

pub fn start_ticker(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = interval(Duration::from_secs(1));

        loop {
            interval.tick().await;

            // Access State
            let engine = app.state::<PrayerEngine>();
            let now = chrono::Local::now();

            // 1. TRAY & FRONTEND UPDATE
            if let Some(next) = engine.get_next_prayer() {
                // Map names to Malay
                let is_friday = now.weekday() == chrono::Weekday::Fri;
                let display_name = match next.name.as_str() {
                    "fajr" => "Subuh",
                    "syuruk" => "Syuruk",
                    "dhuhr" => if is_friday { "Jumaat" } else { "Zohor" },
                    "asr" => "Asar",
                    "maghrib" => "Maghrib",
                    "isha" => "Isyak",
                    _ => next.name.as_str(),
                };

                let tray_str = format!(" {} - {}", display_name, next.remaining);
                // Using to_mono_digits helper
                let mono_str = to_mono_digits(&tray_str);

                if let Some(tray) = app.tray_by_id("main") {
                    let _ = tray.set_title(Some(&mono_str));
                }

                // Emit Event to Frontend
                let _ = app.emit("prayer-update", &next);
            }

            // 2. TRIGGER ACTIONS (Audio / Notification)
            if let Some(schedule) = engine.get_today_schedule() {
                let current_timestamp = now.timestamp();

                // Collect prayer times into a list to iterate
                let prayers = vec![
                    ("fajr", schedule.fajr),
                    ("syuruk", schedule.syuruk),
                    ("dhuhr", schedule.dhuhr),
                    ("asr", schedule.asr),
                    ("maghrib", schedule.maghrib),
                    ("isha", schedule.isha),
                ];

                for (name, time) in prayers {
                    // Trigger Window: Allow 1 second variance or exact match
                    if current_timestamp == time {
                        println!("Rust: 🔔 TIME MATCH for {}!", name);

                        // A. Load Settings
                        let user_settings = settings::load_settings(&app);
                        let mode = user_settings.get_audio_mode(name);
                        let adhan_voice = user_settings.get_adhan_voice();

                        // B. Notification
                        if name != "syuruk" {
                            let mut title = "Sajda";
                            let mut body = format!("It is now time for {}", name.to_uppercase());

                            let is_friday = now.weekday() == chrono::Weekday::Fri;
                            if name == "dhuhr" && is_friday && user_settings.is_alkahf_enabled() {
                                title = "Jumu'ah Mubarak";
                                body = "Don't forget to read Surah Al-Kahf today.".to_string();
                            }

                            let _ = app.notification().builder().title(title).body(body).show();
                        }

                        // D. Audio
                        if mode != "mute" && name != "syuruk" {
                            use crate::audio::AudioState;
                            let audio_state = app.state::<AudioState>();

                            let filename = if mode == "adhan" {
                                if name == "fajr" {
                                    "Adhan_Fajr.mp3"
                                } else {
                                    if adhan_voice == "Ahmed" {
                                        "Ahmed.mp3"
                                    } else {
                                        "Nasser.mp3"
                                    }
                                }
                            } else {
                                "Chime.mp3"
                            };

                            let resource_path = app.path().resolve(
                                format!("resources/audio/{}", filename),
                                tauri::path::BaseDirectory::Resource,
                            );

                            if let Ok(path) = resource_path {
                                println!("Rust: Playing Audio {}", path.display());
                                let _ = crate::audio::play_audio_file(
                                    app.clone(),
                                    path.to_string_lossy().to_string(),
                                    audio_state.clone(),
                                )
                                .await;
                            } else {
                                println!("Rust: Failed to resolve audio resource");
                            }
                        }
                    }
                }
            }

            // 3. DAILY REMINDERS (Check every minute)
            if now.second() == 0 {
                let user_settings = settings::load_settings(&app);

                if user_settings.is_reminders_enabled() {
                    let current_hm = now.format("%H:%M").to_string();

                    let active_times = if user_settings.is_random_reminders() {
                        generate_random_times(now.year(), now.month(), now.day())
                    } else {
                        user_settings.get_reminder_times()
                    };

                    if active_times.contains(&current_hm) {
                        println!("Rust: 🔔 REMINDER TRIGGER at {}", current_hm);

                        // Emit event to frontend for content generation + notification
                        let _ = app.emit("reminder-trigger", &current_hm);

                        // Show window to ensure JS context processes the event
                        if let Some(window) = app.get_webview_window("main") {
                            #[cfg(target_os = "macos")]
                            let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                            let _ = window.show();
                        }
                    }
                }
            }
        }
    }); // End Spawn
}
