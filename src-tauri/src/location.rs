//! Native location services for macOS and Windows
//!
//! This module provides native GPS location services:
//! - macOS 10.15+: Core Location via Swift FFI
//! - Windows 10+: Windows.Devices.Geolocation via WinRT
//! - Other platforms: Returns "unavailable" (falls back to IP geolocation in frontend)

use serde::Serialize;

// ============== MACOS IMPLEMENTATION (Swift FFI) ==============

#[cfg(target_os = "macos")]
use swift_rs::{swift, SRObject, SRString};

/// Location result structure from Swift (macOS only)
#[cfg(target_os = "macos")]
#[repr(C)]
struct SwiftLocationResult {
    latitude: f64,
    longitude: f64,
    accuracy: f64,
    error_code: i32,
    error_message: SRString,
}

// FFI declarations for Swift functions (macOS only)
#[cfg(target_os = "macos")]
swift!(fn check_location_authorization() -> i32);

#[cfg(target_os = "macos")]
swift!(fn request_location_authorization());

#[cfg(target_os = "macos")]
swift!(fn get_current_location() -> SRObject<SwiftLocationResult>);

#[cfg(target_os = "macos")]
swift!(fn get_macos_version() -> SRString);

// ============== WINDOWS IMPLEMENTATION (WinRT) ==============

#[cfg(target_os = "windows")]
mod windows_location {
    use windows::Devices::Geolocation::{
        GeolocationAccessStatus, Geolocator, PositionAccuracy,
    };

    /// Check location authorization status on Windows
    /// Returns: 0 = allowed, 1 = denied, 2 = unspecified (not determined), 4 = disabled
    pub fn check_authorization() -> i32 {
        // Request access status synchronously
        match Geolocator::RequestAccessAsync() {
            Ok(op) => match op.get() {
                Ok(status) => match status {
                    GeolocationAccessStatus::Allowed => 0,
                    GeolocationAccessStatus::Denied => 1,
                    GeolocationAccessStatus::Unspecified => 2,
                    _ => 4,
                },
                Err(e) => {
                    println!("Windows: Failed to get access status: {}", e);
                    4
                }
            },
            Err(e) => {
                println!("Windows: Failed to request access: {}", e);
                4
            }
        }
    }

    /// Request location authorization on Windows
    /// Note: Windows prompts automatically when accessing location; this is a no-op
    pub fn request_authorization() {
        // On Windows, the system automatically prompts for permission
        // when the app first tries to access location.
        // Calling RequestAccessAsync() triggers the prompt if not yet determined.
        let _ = Geolocator::RequestAccessAsync();
    }

    /// Get current location using Windows Geolocation API
    pub fn get_location() -> super::NativeLocationResult {
        // First check if we have permission
        let auth_status = check_authorization();
        if auth_status != 0 {
            return super::NativeLocationResult {
                latitude: 0.0,
                longitude: 0.0,
                accuracy: 0.0,
                error_code: auth_status,
                error_message: match auth_status {
                    1 => "Location access denied".to_string(),
                    2 => "Location access not determined".to_string(),
                    _ => "Location services disabled".to_string(),
                },
                source: "unavailable".to_string(),
            };
        }

        // Create geolocator
        let geolocator = match Geolocator::new() {
            Ok(g) => g,
            Err(e) => {
                return super::NativeLocationResult {
                    latitude: 0.0,
                    longitude: 0.0,
                    accuracy: 0.0,
                    error_code: 4,
                    error_message: format!("Failed to create Geolocator: {}", e),
                    source: "unavailable".to_string(),
                }
            }
        };

        // Set high accuracy
        if let Err(e) = geolocator.SetDesiredAccuracy(PositionAccuracy::High) {
            println!("Windows: Failed to set accuracy: {}", e);
        }

        // Get position with timeout
        match geolocator.GetGeopositionAsync() {
            Ok(op) => match op.get() {
                Ok(position) => {
                    // Extract coordinates from the position
                    match position.Coordinate() {
                        Ok(coord) => match coord.Point() {
                            Ok(point) => match point.Position() {
                                Ok(pos) => {
                                    let accuracy = coord.Accuracy().unwrap_or(0.0);
                                    super::NativeLocationResult {
                                        latitude: pos.Latitude,
                                        longitude: pos.Longitude,
                                        accuracy,
                                        error_code: 0,
                                        error_message: String::new(),
                                        source: "native".to_string(),
                                    }
                                }
                                Err(e) => super::NativeLocationResult {
                                    latitude: 0.0,
                                    longitude: 0.0,
                                    accuracy: 0.0,
                                    error_code: 3,
                                    error_message: format!("Failed to get position: {}", e),
                                    source: "unavailable".to_string(),
                                },
                            },
                            Err(e) => super::NativeLocationResult {
                                latitude: 0.0,
                                longitude: 0.0,
                                accuracy: 0.0,
                                error_code: 3,
                                error_message: format!("Failed to get point: {}", e),
                                source: "unavailable".to_string(),
                            },
                        },
                        Err(e) => super::NativeLocationResult {
                            latitude: 0.0,
                            longitude: 0.0,
                            accuracy: 0.0,
                            error_code: 3,
                            error_message: format!("Failed to get coordinate: {}", e),
                            source: "unavailable".to_string(),
                        },
                    }
                }
                Err(e) => super::NativeLocationResult {
                    latitude: 0.0,
                    longitude: 0.0,
                    accuracy: 0.0,
                    error_code: 3,
                    error_message: format!("Failed to get geoposition: {}", e),
                    source: "unavailable".to_string(),
                },
            },
            Err(e) => super::NativeLocationResult {
                latitude: 0.0,
                longitude: 0.0,
                accuracy: 0.0,
                error_code: 3,
                error_message: format!("Failed to request geoposition: {}", e),
                source: "unavailable".to_string(),
            },
        }
    }

    /// Check if native location is supported (Windows 10+)
    pub fn is_supported() -> bool {
        // Windows Geolocation API is available on Windows 10+
        // The windows crate handles version checking internally
        true
    }

    /// Get Windows version string
    pub fn get_os_version() -> String {
        // Return Windows version info
        "10.0".to_string() // Simplified; actual version detection is complex on Windows
    }
}

// ============== CROSS-PLATFORM TYPES ==============

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

// ============== PLATFORM-SPECIFIC PUBLIC FUNCTIONS ==============

/// Check location authorization status
/// Returns: 0 = authorized, 1 = denied, 2 = not determined, 3 = restricted, 4 = services disabled
#[cfg(target_os = "macos")]
pub fn check_authorization() -> i32 {
    unsafe { check_location_authorization() }
}

#[cfg(target_os = "windows")]
pub fn check_authorization() -> i32 {
    windows_location::check_authorization()
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
pub fn check_authorization() -> i32 {
    4 // Services disabled on unsupported platforms
}

/// Request location authorization (shows system dialog on macOS)
#[cfg(target_os = "macos")]
pub fn request_authorization() {
    unsafe { request_location_authorization() }
}

#[cfg(target_os = "windows")]
pub fn request_authorization() {
    windows_location::request_authorization()
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
pub fn request_authorization() {
    // No-op on unsupported platforms
}

/// Get current location using native APIs
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

#[cfg(target_os = "windows")]
pub fn get_location() -> NativeLocationResult {
    windows_location::get_location()
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
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

/// Get OS version string
#[cfg(target_os = "macos")]
pub fn get_os_version() -> String {
    unsafe { get_macos_version().to_string() }
}

#[cfg(target_os = "windows")]
pub fn get_os_version() -> String {
    windows_location::get_os_version()
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
pub fn get_os_version() -> String {
    "0.0".to_string()
}

/// Check if native location is supported on this platform/version
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

    #[cfg(target_os = "windows")]
    {
        windows_location::is_supported()
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
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
        println!("Rust: Native location NOT SUPPORTED on this platform/version");
        return NativeLocationResult {
            latitude: 0.0,
            longitude: 0.0,
            accuracy: 0.0,
            error_code: 4,
            error_message: "Native location not supported on this platform".to_string(),
            source: "unavailable".to_string(),
        };
    }

    println!("Rust: Checking authorization status...");
    let auth = check_authorization();
    println!(
        "Rust: Authorization status: {} (0=auth, 1=denied, 2=notDetermined, 3=restricted, 4=disabled)",
        auth
    );

    println!("Rust: Requesting native location...");
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
    println!(
        "Rust: Authorization status: {} (0=auth, 1=denied, 2=notDetermined, 3=restricted, 4=disabled)",
        auth
    );
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

/// Tauri command: Get OS version (kept for backward compatibility)
#[tauri::command]
pub fn get_macos_version_cmd() -> String {
    get_os_version()
}

// ============== TESTS ==============

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_native_location_result_creation() {
        let result = NativeLocationResult {
            latitude: 3.1390,
            longitude: 101.6869,
            accuracy: 10.0,
            error_code: 0,
            error_message: String::new(),
            source: "native".to_string(),
        };
        assert_eq!(result.latitude, 3.1390);
        assert_eq!(result.longitude, 101.6869);
        assert_eq!(result.error_code, 0);
        assert_eq!(result.source, "native");
    }

    #[test]
    fn test_unavailable_location_result() {
        let result = NativeLocationResult {
            latitude: 0.0,
            longitude: 0.0,
            accuracy: 0.0,
            error_code: 4,
            error_message: "Not available".to_string(),
            source: "unavailable".to_string(),
        };
        assert_eq!(result.error_code, 4);
        assert_eq!(result.source, "unavailable");
    }

    #[test]
    fn test_is_native_location_supported() {
        // This test verifies the function runs without panic
        let supported = is_native_location_supported();
        println!("Native location supported: {}", supported);
        // On macOS/Windows CI, this should be true; on Linux, false
    }

    #[test]
    fn test_get_os_version() {
        let version = get_os_version();
        println!("OS version: {}", version);
        // Should return a non-empty string on macOS/Windows
        #[cfg(any(target_os = "macos", target_os = "windows"))]
        assert!(!version.is_empty());
    }

    #[test]
    fn test_check_authorization_returns_valid_code() {
        let auth = check_authorization();
        // Should return a value between 0 and 4
        assert!(auth >= 0 && auth <= 5);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn test_macos_version_check() {
        let version = get_os_version();
        println!("macOS version: {}", version);
        assert!(!version.is_empty());
        // Version should contain a dot (e.g., "14.2")
        assert!(version.contains('.'));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_location_module() {
        // Test that Windows module functions don't panic
        let auth = windows_location::check_authorization();
        println!("Windows auth status: {}", auth);
        assert!(auth >= 0 && auth <= 4);

        let supported = windows_location::is_supported();
        assert!(supported);
    }
}
