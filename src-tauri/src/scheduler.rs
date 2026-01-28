use crate::prayer_engine::PrayerEngine; // Import the struct
use crate::settings;
use chrono::{Datelike, NaiveDate, Timelike};
use std::collections::HashSet;
use std::time::{Duration, Instant};
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

        // Track triggered prayers to prevent duplicates
        let mut triggered_today: HashSet<String> = HashSet::new();
        let mut last_date: Option<NaiveDate> = None;

        // Track last tick time to detect sleep/wake cycles
        let mut last_tick_time: Option<Instant> = None;
        const WAKE_THRESHOLD_SECS: u64 = 5;

        loop {
            interval.tick().await;

            // Detect wake from sleep via time jump
            let now_instant = Instant::now();
            let detected_wake = if let Some(last_tick) = last_tick_time {
                last_tick.elapsed().as_secs() > WAKE_THRESHOLD_SECS
            } else {
                false
            };
            last_tick_time = Some(now_instant);

            // Access State
            let engine = app.state::<PrayerEngine>();
            let now = chrono::Local::now();

            // On wake: mark past prayers as triggered to prevent stale adhan
            if detected_wake {
                println!("Rust: Wake from sleep detected");
                if let Some(schedule) = engine.get_today_schedule() {
                    let current_timestamp = now.timestamp();
                    for (name, time) in [
                        ("fajr", schedule.fajr),
                        ("syuruk", schedule.syuruk),
                        ("dhuhr", schedule.dhuhr),
                        ("asr", schedule.asr),
                        ("maghrib", schedule.maghrib),
                        ("isha", schedule.isha),
                    ] {
                        if current_timestamp > time && !triggered_today.contains(name) {
                            triggered_today.insert(name.to_string());
                            println!("Rust: [Wake] Marked past prayer: {}", name);
                        }
                    }
                }

                // Emit wake event to frontend for update checks
                let _ = app.emit("system-wake", ());
            }

            // Reset triggered set at midnight
            let current_date = now.date_naive();
            if last_date != Some(current_date) {
                triggered_today.clear();
                last_date = Some(current_date);
                println!("Rust: New day detected, reset triggered prayers");
            }

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
                    // Trigger Window: Allow 2 second window to prevent missed prayers
                    let in_window = current_timestamp >= time && current_timestamp < time + 2;
                    let prayer_key = name.to_string();

                    if in_window && !triggered_today.contains(&prayer_key) {
                        triggered_today.insert(prayer_key);
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
                            let audio_state = app.state::<Option<AudioState>>();

                            // Only attempt playback if audio device is available
                            if audio_state.is_some() {
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
                            } else {
                                println!("Rust: No audio device available, skipping audio playback");
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_random_times_returns_three_times() {
        let times = generate_random_times(2025, 1, 15);
        assert_eq!(times.len(), 3);
    }

    #[test]
    fn test_generate_random_times_within_bounds() {
        let times = generate_random_times(2025, 6, 20);
        for time in &times {
            let parts: Vec<&str> = time.split(':').collect();
            let hour: u32 = parts[0].parse().unwrap();
            let minute: u32 = parts[1].parse().unwrap();
            let total_minutes = hour * 60 + minute;
            assert!(total_minutes >= 8 * 60, "Time {} is before 08:00", time);
            assert!(total_minutes <= 21 * 60, "Time {} is after 21:00", time);
        }
    }

    #[test]
    fn test_generate_random_times_minimum_gap() {
        let times = generate_random_times(2025, 12, 31);
        for i in 1..times.len() {
            let prev_parts: Vec<&str> = times[i - 1].split(':').collect();
            let curr_parts: Vec<&str> = times[i].split(':').collect();
            let prev_minutes: u32 =
                prev_parts[0].parse::<u32>().unwrap() * 60 + prev_parts[1].parse::<u32>().unwrap();
            let curr_minutes: u32 =
                curr_parts[0].parse::<u32>().unwrap() * 60 + curr_parts[1].parse::<u32>().unwrap();
            assert!(
                curr_minutes >= prev_minutes + 90 || curr_minutes == 21 * 60,
                "Gap between {} and {} is less than 90 minutes",
                times[i - 1],
                times[i]
            );
        }
    }

    #[test]
    fn test_generate_random_times_deterministic() {
        let times1 = generate_random_times(2025, 3, 10);
        let times2 = generate_random_times(2025, 3, 10);
        assert_eq!(times1, times2, "Same date should produce same times");
    }

    #[test]
    fn test_generate_random_times_different_dates() {
        let times1 = generate_random_times(2025, 3, 10);
        let times2 = generate_random_times(2025, 3, 11);
        assert_ne!(times1, times2, "Different dates should produce different times");
    }

    #[test]
    fn test_generate_random_times_sorted() {
        let times = generate_random_times(2025, 7, 4);
        for i in 1..times.len() {
            assert!(times[i] >= times[i - 1], "Times should be sorted");
        }
    }

    #[test]
    fn test_to_mono_digits_basic() {
        let result = to_mono_digits("12:34");
        assert!(result.contains('\u{1D7F7}')); // monospace 1
        assert!(result.contains('\u{1D7F8}')); // monospace 2
        assert!(result.contains(':')); // colon preserved
    }

    #[test]
    fn test_to_mono_digits_preserves_non_digits() {
        let result = to_mono_digits("Subuh - 05:30");
        assert!(result.contains("Subuh"));
        assert!(result.contains("-"));
        assert!(result.contains(" "));
    }

    #[test]
    fn test_to_mono_digits_all_digits() {
        let input = "0123456789";
        let result = to_mono_digits(input);
        // Each digit should be converted to monospace equivalent
        assert_eq!(result.chars().count(), 10);
        // First char should be monospace 0 (U+1D7F6)
        assert_eq!(result.chars().next().unwrap(), '\u{1D7F6}');
        // Last char should be monospace 9 (U+1D7FF)
        assert_eq!(result.chars().last().unwrap(), '\u{1D7FF}');
    }

    #[test]
    fn test_to_mono_digits_empty_string() {
        let result = to_mono_digits("");
        assert_eq!(result, "");
    }

    #[test]
    fn test_to_mono_digits_no_digits() {
        let result = to_mono_digits("Hello World");
        assert_eq!(result, "Hello World");
    }
}
