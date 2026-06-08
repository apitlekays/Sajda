use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Base URL for JAKIM prayer times API (waktusolat.app).
/// This API provides official Malaysian prayer times based on GPS coordinates.
/// The API returns prayer times for the current month based on JAKIM data.
const API_BASE: &str = "https://api.waktusolat.app/v2/solat/gps";

/// URL for fetching Malaysian zone data (state/district mappings).
const ZONES_URL: &str = "https://api.waktusolat.app/zones";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Zone {
    #[serde(rename = "jakimCode")]
    pub jakim_code: String,
    pub negeri: String,
    pub daerah: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrayerDatapoint {
    pub day: i32,
    pub fajr: i64,
    pub syuruk: i64,
    pub dhuhr: i64,
    pub asr: i64,
    pub maghrib: i64,
    pub isha: i64,
    pub hijri: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SolatResponse {
    pub prayers: Vec<PrayerDatapoint>,
    pub status: Option<String>,
    pub zone: String,
    pub year: i32,
    pub month: String, // "JAN"
    #[serde(default)]
    pub month_number: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JakimCache {
    pub zone: String,
    pub lat: f64,
    pub lng: f64,
    pub month_hash: String, // e.g. "6-2026" (numeric month-year, locale-independent)
    pub prayers: HashMap<String, PrayerDatapoint>,
}

/// Locale-independent cache key: "DD-MM-YYYY" (e.g. "08-06-2026")
pub fn make_date_key(day: i32, month: u32, year: i32) -> String {
    format!("{:02}-{:02}-{}", day, month, year)
}

/// Locale-independent month hash for cache freshness checks
pub fn make_month_hash(month: u32, year: i32) -> String {
    format!("{}-{}", month, year)
}

fn parse_month_abbr(month: &str) -> Option<u32> {
    match month.to_uppercase().as_str() {
        "JAN" => Some(1),
        "FEB" => Some(2),
        "MAR" => Some(3),
        "APR" => Some(4),
        "MAY" => Some(5),
        "JUN" => Some(6),
        "JUL" => Some(7),
        "AUG" => Some(8),
        "SEP" => Some(9),
        "OCT" => Some(10),
        "NOV" => Some(11),
        "DEC" => Some(12),
        _ => None,
    }
}

pub fn resolve_month_number(data: &SolatResponse) -> u32 {
    if data.month_number > 0 {
        return data.month_number;
    }
    parse_month_abbr(&data.month).unwrap_or(1)
}

pub fn build_cache(lat: f64, lng: f64, data: &SolatResponse) -> JakimCache {
    let month = resolve_month_number(data);
    let mut map = HashMap::new();
    for p in &data.prayers {
        let key = make_date_key(p.day, month, data.year);
        map.insert(key, p.clone());
    }

    JakimCache {
        zone: data.zone.clone(),
        lat,
        lng,
        month_hash: make_month_hash(month, data.year),
        prayers: map,
    }
}

// Global Zones Cache
pub type ZonesMap = HashMap<String, Zone>;

pub fn get_cache_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|p| p.join("jakim_cache.json"))
}

pub fn get_zones_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|p| p.join("zones_cache.json"))
}

pub async fn fetch_zones() -> Result<Vec<Zone>, String> {
    println!("Rust: Fetching Zones from {}", ZONES_URL);
    let client = reqwest::Client::new();
    let resp = client.get(ZONES_URL).send().await.map_err(|e| e.to_string())?;
    resp.json::<Vec<Zone>>().await.map_err(|e| e.to_string())
}

pub fn save_zones_cache(app: &AppHandle, zones: &[Zone]) -> Result<(), String> {
    let path = get_zones_path(app).ok_or("Failed to get zones path")?;
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::to_string(zones).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn load_zones_cache(app: &AppHandle) -> Option<ZonesMap> {
    let path = get_zones_path(app)?;
    let content = fs::read_to_string(path).ok()?;
    let zones: Vec<Zone> = serde_json::from_str(&content).ok()?;
    let mut map = HashMap::new();
    for z in zones {
        map.insert(z.jakim_code.clone(), z);
    }
    Some(map)
}

pub async fn fetch_jakim_times(lat: f64, lng: f64) -> Result<SolatResponse, String> {
    let url = format!("{}/{}/{}", API_BASE, lat, lng);
    println!("Rust: Fetching JAKIM data from {}", url);

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("API returned status: {}", resp.status()));
    }

    let data = resp
        .json::<SolatResponse>()
        .await
        .map_err(|e| format!("JSON Parse failed: {}", e))?;

    Ok(data)
}

pub fn save_cache(app: &AppHandle, lat: f64, lng: f64, data: &SolatResponse) -> Result<(), String> {
    let path = get_cache_path(app).ok_or("Failed to get cache path")?;

    // Create dir if missing
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let cache = build_cache(lat, lng, data);

    let json = serde_json::to_string(&cache).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;

    println!("Rust: JAKIM Cache saved successfully for {}", data.zone);
    Ok(())
}

pub fn load_cache(app: &AppHandle) -> Option<JakimCache> {
    let path = get_cache_path(app)?;
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_response() -> SolatResponse {
        SolatResponse {
            prayers: vec![PrayerDatapoint {
                day: 8,
                fajr: 0,
                syuruk: 0,
                dhuhr: 0,
                asr: 0,
                maghrib: 0,
                isha: 0,
                hijri: Some("1447-12-22".to_string()),
            }],
            status: None,
            zone: "WLY01".to_string(),
            year: 2026,
            month: "JUN".to_string(),
            month_number: 6,
        }
    }

    #[test]
    fn test_make_date_key_is_locale_independent() {
        assert_eq!(make_date_key(8, 6, 2026), "08-06-2026");
    }

    #[test]
    fn test_make_month_hash() {
        assert_eq!(make_month_hash(6, 2026), "6-2026");
    }

    #[test]
    fn test_build_cache_uses_numeric_keys() {
        let cache = build_cache(3.14, 101.69, &sample_response());
        assert_eq!(cache.month_hash, "6-2026");
        assert!(cache.prayers.contains_key("08-06-2026"));
        assert_eq!(
            cache.prayers.get("08-06-2026").unwrap().hijri,
            Some("1447-12-22".to_string())
        );
    }

    #[test]
    fn test_resolve_month_number_from_abbr() {
        let mut data = sample_response();
        data.month_number = 0;
        data.month = "JUN".to_string();
        assert_eq!(resolve_month_number(&data), 6);
    }
}
