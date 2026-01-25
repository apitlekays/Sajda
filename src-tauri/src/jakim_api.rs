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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JakimCache {
    pub zone: String,
    pub lat: f64,
    pub lng: f64,
    pub month_hash: String, // e.g. "Jan-2026"
    pub prayers: HashMap<String, PrayerDatapoint>,
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

    // Convert Vec to Map with Date Key Construction
    let month_capitalized = format!(
        "{}{}",
        data.month.chars().next().unwrap_or_default().to_uppercase(),
        data.month
            .chars()
            .skip(1)
            .collect::<String>()
            .to_lowercase()
    );

    let mut map = HashMap::new();
    for p in &data.prayers {
        // Construct: "23-Jan-2026"
        let key = format!("{:02}-{}-{}", p.day, month_capitalized, data.year);
        map.insert(key, p.clone());
    }

    let month_hash = format!("{}-{}", month_capitalized, data.year);

    let cache = JakimCache {
        zone: data.zone.clone(),
        lat,
        lng,
        month_hash,
        prayers: map,
    };

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
