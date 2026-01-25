//! Native macOS Core Location integration via Swift FFI
//!
//! This module provides native GPS location services on macOS 10.15+.
//! Falls back gracefully on unsupported platforms or older macOS versions.

use serde::Serialize;

#[cfg(target_os = "macos")]
use swift_rs::{swift, SRObject, SRString};

/// Location result returned to frontend
#[derive(Debug, Clone, Serialize)]
pub struct NativeLocationResult {
    pub latitude: f64,
    pub longitude: f64,
    pub accuracy: f64,
    pub error_code: i32,
    pub error_message: String,
    pub source: String, // "native" or "unavailable"
}

/// Location result structure from Swift
#[cfg(target_os = "macos")]
#[repr(C)]
struct SwiftLocationResult {
    latitude: f64,
    longitude: f64,
    accuracy: f64,
    error_code: i32,
    error_message: SRString,
}

// FFI declarations for Swift functions
#[cfg(target_os = "macos")]
swift!(fn check_location_authorization() -> i32);

#[cfg(target_os = "macos")]
swift!(fn request_location_authorization());

#[cfg(target_os = "macos")]
swift!(fn get_current_location() -> SRObject<SwiftLocationResult>);

// Note: Swift returns LocationResult directly as it inherits from NSObject

#[cfg(target_os = "macos")]
swift!(fn get_macos_version() -> SRString);

/// Check location authorization status
/// Returns: 0 = authorized, 1 = denied, 2 = not determined, 3 = restricted, 4 = services disabled
#[cfg(target_os = "macos")]
pub fn check_authorization() -> i32 {
    unsafe { check_location_authorization() }
}

#[cfg(not(target_os = "macos"))]
pub fn check_authorization() -> i32 {
    4 // Services disabled on non-macOS
}

/// Request location authorization (shows system dialog)
#[cfg(target_os = "macos")]
pub fn request_authorization() {
    unsafe { request_location_authorization() }
}

#[cfg(not(target_os = "macos"))]
pub fn request_authorization() {
    // No-op on non-macOS
}

/// Get current location using native Core Location
#[cfg(target_os = "macos")]
pub fn get_location() -> NativeLocationResult {
    let result = unsafe { get_current_location() };

    NativeLocationResult {
        latitude: result.latitude,
        longitude: result.longitude,
        accuracy: result.accuracy,
        error_code: result.error_code,
        error_message: result.error_message.to_string(),
        source: if result.error_code == 0 {
            "native".to_string()
        } else {
            "unavailable".to_string()
        },
    }
}

#[cfg(not(target_os = "macos"))]
pub fn get_location() -> NativeLocationResult {
    NativeLocationResult {
        latitude: 0.0,
        longitude: 0.0,
        accuracy: 0.0,
        error_code: 4,
        error_message: "Native location not available on this platform".to_string(),
        source: "unavailable".to_string(),
    }
}

/// Get macOS version string (e.g., "14.2")
#[cfg(target_os = "macos")]
pub fn get_os_version() -> String {
    unsafe { get_macos_version().to_string() }
}

#[cfg(not(target_os = "macos"))]
pub fn get_os_version() -> String {
    "0.0".to_string()
}

/// Check if native location is supported (macOS 10.15+)
pub fn is_native_location_supported() -> bool {
    #[cfg(target_os = "macos")]
    {
        let version = get_os_version();
        if let Some(major) = version.split('.').next() {
            if let Ok(major_num) = major.parse::<i32>() {
                // macOS 10.15 = Catalina, 11+ = Big Sur onwards
                // Version 10.15+ or 11+ is required
                return major_num >= 11 || (major_num == 10 && version.contains("15"));
            }
        }
        false
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

// ============== TAURI COMMANDS ==============

/// Tauri command: Get native location
#[tauri::command]
pub fn get_native_location() -> NativeLocationResult {
    println!("Rust: get_native_location called");

    if !is_native_location_supported() {
        println!("Rust: Native location NOT SUPPORTED (macOS version too old)");
        return NativeLocationResult {
            latitude: 0.0,
            longitude: 0.0,
            accuracy: 0.0,
            error_code: 4,
            error_message: "Native location requires macOS 10.15 or later".to_string(),
            source: "unavailable".to_string(),
        };
    }

    println!("Rust: Checking authorization status...");
    let auth = check_authorization();
    println!("Rust: Authorization status: {} (0=auth, 1=denied, 2=notDetermined, 3=restricted, 4=disabled)", auth);

    println!("Rust: Requesting native location from Swift...");
    let result = get_location();
    println!(
        "Rust: Native location result - lat: {}, lng: {}, accuracy: {}, error_code: {}, error_msg: {}",
        result.latitude, result.longitude, result.accuracy, result.error_code, result.error_message
    );
    result
}

/// Tauri command: Check native location authorization
#[tauri::command]
pub fn check_native_location_auth() -> i32 {
    println!("Rust: check_native_location_auth called");
    if !is_native_location_supported() {
        println!("Rust: Native location not supported - returning 4");
        return 4; // Not supported
    }
    let auth = check_authorization();
    println!("Rust: Authorization status from Swift: {} (0=auth, 1=denied, 2=notDetermined, 3=restricted, 4=disabled)", auth);
    auth
}

/// Tauri command: Request native location authorization
#[tauri::command]
pub fn request_native_location_auth() {
    if is_native_location_supported() {
        println!("Rust: Requesting location authorization...");
        request_authorization();
    }
}

/// Tauri command: Check if native location is supported
#[tauri::command]
pub fn is_native_location_available() -> bool {
    let supported = is_native_location_supported();
    println!("Rust: Native location supported: {}", supported);
    supported
}

/// Tauri command: Get macOS version
#[tauri::command]
pub fn get_macos_version_cmd() -> String {
    get_os_version()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_check() {
        // This test will pass on macOS 10.15+
        let version = get_os_version();
        println!("macOS version: {}", version);
        assert!(!version.is_empty());
    }
}
