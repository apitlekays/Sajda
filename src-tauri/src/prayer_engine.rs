use crate::jakim_api::{self, JakimCache, ZonesMap};
use crate::settings;
use chrono::{Datelike, Local, NaiveDate};
use salah::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrayerSchedule {
    pub fajr: i64,
    pub syuruk: i64,
    pub dhuhr: i64,
    pub asr: i64,
    pub maghrib: i64,
    pub isha: i64,
    pub source: String,
    pub zone_code: String,
    pub zone_name: String,
    pub hijri: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NextPrayer {
    pub name: String,
    pub time: String,      // HH:MM
    pub remaining: String, // HH:MM:SS
    pub timestamp: i64,
}

pub struct PrayerEngine {
    coordinates: Mutex<Option<Coordinates>>,
    strategy: Mutex<Parameters>,
    cache: Mutex<Option<JakimCache>>,
    zones: Mutex<Option<ZonesMap>>,
    current_method: Mutex<String>,
}

impl PrayerEngine {
    pub fn new(app: &AppHandle) -> Self {
        // Use JAKIM standard (Fajr 18, Isha 18)
        // Load Settings
        let user_settings = settings::load_settings(app);
        let method_name = user_settings.get_calculation_method();

        let madhab = Madhab::Shafi;
        let params = match method_name.as_str() {
            "MWL" => Method::MuslimWorldLeague.parameters(),
            "ISNA" => Method::NorthAmerica.parameters(),
            "Egypt" => Method::Egyptian.parameters(),
            "Makkah" => Method::UmmAlQura.parameters(),
            "Karachi" => Method::Karachi.parameters(),
            "Tehran" => Method::Tehran.parameters(),
            "Gulf" => Method::Dubai.parameters(),
            "Kuwait" => Method::Kuwait.parameters(),
            "Qatar" => Method::Qatar.parameters(),
            "Singapore" => Method::Singapore.parameters(),
            // JAKIM Standard (Custom) or Default
            _ => Configuration::new(18.0, 18.0).madhab(madhab).done(),
        };

        let initial_cache = jakim_api::load_cache(app);
        if initial_cache.is_some() {
            println!("Rust: Initial JAKIM Cache Loaded");
        }

        let initial_zones = jakim_api::load_zones_cache(app);

        Self {
            coordinates: Mutex::new(None),
            strategy: Mutex::new(params),
            cache: Mutex::new(initial_cache),
            zones: Mutex::new(initial_zones),
            current_method: Mutex::new(method_name),
        }
    }

    pub fn update_zones(&self, new_map: ZonesMap) {
        let mut z = self.zones.lock().unwrap();
        *z = Some(new_map);
        println!("Rust: Zones Map Updated");
    }

    pub fn set_method(&self, method_name: &str) {
        let madhab = Madhab::Shafi; // Default for now, maybe customizable later

        let params = match method_name {
            "MWL" => Method::MuslimWorldLeague.parameters(),
            "ISNA" => Method::NorthAmerica.parameters(),
            "Egypt" => Method::Egyptian.parameters(),
            "Makkah" => Method::UmmAlQura.parameters(),
            "Karachi" => Method::Karachi.parameters(),
            "Tehran" => Method::Tehran.parameters(),
            "Gulf" => Method::Dubai.parameters(),
            "Kuwait" => Method::Kuwait.parameters(),
            "Qatar" => Method::Qatar.parameters(),
            "Singapore" => Method::Singapore.parameters(),
            // JAKIM Standard (Custom)
            _ => Configuration::new(18.0, 18.0).madhab(madhab).done(),
        };

        // Preserve Madhab if needed, mostly handled in params or set separately
        // params.madhab = madhab; // Salah parameters might store madhab

        let mut strat = self.strategy.lock().unwrap();
        *strat = params;

        let mut cm = self.current_method.lock().unwrap();
        *cm = method_name.to_string();

        println!("Rust: Calculation Method Updated to {}", method_name);
    }

    pub fn update_coordinates(&self, lat: f64, lng: f64) {
        let coords = Coordinates::new(lat, lng);
        let mut c = self.coordinates.lock().unwrap();
        *c = Some(coords);
    }

    pub fn update_cache(&self, new_cache: JakimCache) {
        let mut c = self.cache.lock().unwrap();
        *c = Some(new_cache);
        println!("Rust: PrayerEngine Cache Updated");
    }

    pub fn needs_refetch(&self, lat: f64, lng: f64) -> bool {
        let cache_guard = self.cache.lock().unwrap();
        if let Some(cache) = cache_guard.as_ref() {
            let now_month = Local::now().format("%b-%Y").to_string();
            if cache.month_hash != now_month {
                return true;
            }

            let r = 6371.0;
            let d_lat = (lat - cache.lat).to_radians();
            let d_lon = (lng - cache.lng).to_radians();
            let lat1 = cache.lat.to_radians();
            let lat2 = lat.to_radians();

            let a =
                (d_lat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (d_lon / 2.0).sin().powi(2);
            let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
            let distance = r * c;

            if distance > 5.0 {
                return true;
            }
            return false;
        }
        true
    }

    fn resolve_zone_name(&self, code: &str) -> String {
        let zones = self.zones.lock().unwrap();
        if let Some(map) = zones.as_ref() {
            if let Some(z) = map.get(code) {
                return format!("{}, {}", z.daerah, z.negeri);
            }
        }
        code.to_string()
    }

    // Helper to get formatted local time string
    fn format_time(ts: i64) -> String {
        let dt = chrono::DateTime::<Local>::from(
            std::time::UNIX_EPOCH + std::time::Duration::from_secs(ts as u64),
        );
        dt.format("%H:%M").to_string()
    }

    pub fn get_today_schedule(&self) -> Option<PrayerSchedule> {
        let now = Local::now();
        // API date key format: "dd-MMM-yyyy", e.g. "23-Jan-2026"
        let date_key = now.format("%d-%b-%Y").to_string();

        // 1. Try Cache (ONLY if method is JAKIM)
        {
            let current_method = self.current_method.lock().unwrap();
            if *current_method == "JAKIM" {
                let cache = self.cache.lock().unwrap();
                if let Some(c) = cache.as_ref() {
                    if let Some(p) = c.prayers.get(&date_key) {
                        return Some(PrayerSchedule {
                            fajr: p.fajr,
                            syuruk: p.syuruk,
                            dhuhr: p.dhuhr,
                            asr: p.asr,
                            maghrib: p.maghrib,
                            isha: p.isha,
                            source: "jakim-api".to_string(),
                            zone_code: c.zone.clone(),
                            zone_name: self.resolve_zone_name(&c.zone),
                            hijri: p.hijri.clone(),
                        });
                    }
                }
            }
        }

        // 2. Fallback to Calculation
        let coords = self.coordinates.lock().unwrap();
        let coords = coords.as_ref()?;

        let date = NaiveDate::from_ymd_opt(now.year(), now.month(), now.day())?;

        // Using configured strategy (JAKIM Standard)
        let prayers = PrayerTimes::new(date, *coords, *self.strategy.lock().unwrap());

        let to_timestamp = |dt: chrono::DateTime<chrono::Utc>| -> i64 { dt.timestamp() };

        Some(PrayerSchedule {
            fajr: to_timestamp(prayers.time(Prayer::Fajr)),
            syuruk: to_timestamp(prayers.time(Prayer::Sunrise)),
            dhuhr: to_timestamp(prayers.time(Prayer::Dhuhr)),
            asr: to_timestamp(prayers.time(Prayer::Asr)),
            maghrib: to_timestamp(prayers.time(Prayer::Maghrib)),
            isha: to_timestamp(prayers.time(Prayer::Isha)),
            source: "calculated-fallback".to_string(),
            zone_code: "CALC".to_string(),
            zone_name: format!("{:.4}, {:.4}", coords.latitude, coords.longitude),
            hijri: None,
        })
    }

    pub fn get_next_prayer(&self) -> Option<NextPrayer> {
        let schedule = self.get_today_schedule()?;
        let now = Local::now();
        let now_ts = now.timestamp();

        let list = vec![
            ("fajr", schedule.fajr),
            ("syuruk", schedule.syuruk),
            ("dhuhr", schedule.dhuhr),
            ("asr", schedule.asr),
            ("maghrib", schedule.maghrib),
            ("isha", schedule.isha),
        ];

        for (name, time_ts) in list.iter() {
            if *time_ts > now_ts {
                let diff = *time_ts - now_ts;
                let hours = diff / 3600;
                let minutes = (diff % 3600) / 60;
                let seconds = diff % 60;

                return Some(NextPrayer {
                    name: name.to_string(),
                    time: Self::format_time(*time_ts),
                    remaining: format!("{:02}:{:02}:{:02}", hours, minutes, seconds),
                    timestamp: *time_ts,
                });
            }
        }

        let tomorrow = now.date_naive().succ_opt()?;
        let tom_key = tomorrow.format("%d-%b-%Y").to_string();

        let mut tom_fajr: i64 = 0;
        let mut found = false;

        {
            let cache = self.cache.lock().unwrap();
            if let Some(c) = cache.as_ref() {
                if let Some(p) = c.prayers.get(&tom_key) {
                    tom_fajr = p.fajr;
                    found = true;
                }
            }
        }

        if !found {
            let coords = self.coordinates.lock().unwrap();
            if let Some(coords) = coords.as_ref() {
                let tom_prayers =
                    PrayerTimes::new(tomorrow, *coords, *self.strategy.lock().unwrap());
                tom_fajr = tom_prayers.time(Prayer::Fajr).timestamp();
            } else {
                return None;
            }
        }

        let diff = tom_fajr - now_ts;
        let hours = diff / 3600;
        let minutes = (diff % 3600) / 60;
        let seconds = diff % 60;

        Some(NextPrayer {
            name: "fajr".to_string(),
            time: Self::format_time(tom_fajr),
            remaining: format!("{:02}:{:02}:{:02}", hours, minutes, seconds),
            timestamp: tom_fajr,
        })
    }
}
