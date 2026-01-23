use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Deserialize)]
pub struct Settings {
    pub audio_settings: HashMap<String, String>,
    pub adhan_selection: Option<String>,
    pub reminder_times: Option<Vec<String>>,
    pub alkahf_enabled: Option<bool>,
    pub calculation_method: Option<String>,
    pub reminders_enabled: Option<bool>,
    pub random_reminders: Option<bool>,
}

impl Settings {
    pub fn get_calculation_method(&self) -> String {
        self.calculation_method
            .clone()
            .unwrap_or("JAKIM".to_string())
    }

    pub fn get_reminder_times(&self) -> Vec<String> {
        self.reminder_times
            .clone()
            .unwrap_or_else(|| vec!["09:00".to_string(), "21:00".to_string()])
    }

    pub fn is_alkahf_enabled(&self) -> bool {
        self.alkahf_enabled.unwrap_or(true)
    }

    pub fn get_audio_mode(&self, prayer: &str) -> String {
        self.audio_settings
            .get(prayer)
            .cloned()
            .unwrap_or_else(|| "mute".to_string())
    }

    pub fn get_adhan_voice(&self) -> String {
        self.adhan_selection
            .clone()
            .unwrap_or_else(|| "Nasser".to_string())
    }

    pub fn is_reminders_enabled(&self) -> bool {
        self.reminders_enabled.unwrap_or(true)
    }

    pub fn is_random_reminders(&self) -> bool {
        self.random_reminders.unwrap_or(true)
    }
}

pub fn load_settings(app: &AppHandle) -> Settings {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    let settings_path = app_data_dir.join("settings.json");

    if settings_path.exists() {
        if let Ok(content) = fs::read_to_string(settings_path) {
            if let Ok(settings) = serde_json::from_str::<Settings>(&content) {
                return settings;
            }
        }
    }

    // Default Fallback
    Settings {
        audio_settings: HashMap::new(),
        adhan_selection: Some("Nasser".to_string()),
        reminder_times: Some(vec!["09:00".to_string(), "21:00".to_string()]),
        alkahf_enabled: Some(true),
        calculation_method: Some("JAKIM".to_string()),
        reminders_enabled: Some(true),
        random_reminders: Some(true),
    }
}
