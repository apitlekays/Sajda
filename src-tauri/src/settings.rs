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

#[cfg(test)]
mod tests {
    use super::*;

    fn default_settings() -> Settings {
        Settings {
            audio_settings: HashMap::new(),
            adhan_selection: None,
            reminder_times: None,
            alkahf_enabled: None,
            calculation_method: None,
            reminders_enabled: None,
            random_reminders: None,
        }
    }

    #[test]
    fn test_get_calculation_method_default() {
        let settings = default_settings();
        assert_eq!(settings.get_calculation_method(), "JAKIM");
    }

    #[test]
    fn test_get_calculation_method_custom() {
        let mut settings = default_settings();
        settings.calculation_method = Some("MWL".to_string());
        assert_eq!(settings.get_calculation_method(), "MWL");
    }

    #[test]
    fn test_get_reminder_times_default() {
        let settings = default_settings();
        assert_eq!(settings.get_reminder_times(), vec!["09:00", "21:00"]);
    }

    #[test]
    fn test_get_reminder_times_custom() {
        let mut settings = default_settings();
        settings.reminder_times = Some(vec!["08:00".to_string(), "12:00".to_string(), "18:00".to_string()]);
        assert_eq!(settings.get_reminder_times(), vec!["08:00", "12:00", "18:00"]);
    }

    #[test]
    fn test_is_alkahf_enabled_default() {
        let settings = default_settings();
        assert!(settings.is_alkahf_enabled());
    }

    #[test]
    fn test_is_alkahf_enabled_disabled() {
        let mut settings = default_settings();
        settings.alkahf_enabled = Some(false);
        assert!(!settings.is_alkahf_enabled());
    }

    #[test]
    fn test_get_audio_mode_default() {
        let settings = default_settings();
        assert_eq!(settings.get_audio_mode("fajr"), "mute");
        assert_eq!(settings.get_audio_mode("dhuhr"), "mute");
    }

    #[test]
    fn test_get_audio_mode_custom() {
        let mut settings = default_settings();
        settings.audio_settings.insert("fajr".to_string(), "adhan".to_string());
        settings.audio_settings.insert("dhuhr".to_string(), "chime".to_string());
        assert_eq!(settings.get_audio_mode("fajr"), "adhan");
        assert_eq!(settings.get_audio_mode("dhuhr"), "chime");
        assert_eq!(settings.get_audio_mode("asr"), "mute"); // not set, should default
    }

    #[test]
    fn test_get_adhan_voice_default() {
        let settings = default_settings();
        assert_eq!(settings.get_adhan_voice(), "Nasser");
    }

    #[test]
    fn test_get_adhan_voice_custom() {
        let mut settings = default_settings();
        settings.adhan_selection = Some("Ahmed".to_string());
        assert_eq!(settings.get_adhan_voice(), "Ahmed");
    }

    #[test]
    fn test_is_reminders_enabled_default() {
        let settings = default_settings();
        assert!(settings.is_reminders_enabled());
    }

    #[test]
    fn test_is_random_reminders_default() {
        let settings = default_settings();
        assert!(settings.is_random_reminders());
    }

    #[test]
    fn test_settings_deserialization() {
        let json = r#"{
            "audio_settings": {"fajr": "adhan", "isha": "chime"},
            "adhan_selection": "Ahmed",
            "reminder_times": ["10:00", "15:00"],
            "alkahf_enabled": false,
            "calculation_method": "ISNA",
            "reminders_enabled": true,
            "random_reminders": false
        }"#;

        let settings: Settings = serde_json::from_str(json).unwrap();
        assert_eq!(settings.get_audio_mode("fajr"), "adhan");
        assert_eq!(settings.get_audio_mode("isha"), "chime");
        assert_eq!(settings.get_adhan_voice(), "Ahmed");
        assert_eq!(settings.get_reminder_times(), vec!["10:00", "15:00"]);
        assert!(!settings.is_alkahf_enabled());
        assert_eq!(settings.get_calculation_method(), "ISNA");
        assert!(settings.is_reminders_enabled());
        assert!(!settings.is_random_reminders());
    }
}
