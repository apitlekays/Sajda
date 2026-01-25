import CoreLocation
import Foundation
import SwiftRs

/// Result structure for location data
/// Using a class that inherits from NSObject for swift-rs compatibility
public class LocationResult: NSObject {
    @objc var latitude: Double
    @objc var longitude: Double
    @objc var accuracy: Double
    @objc var errorCode: Int32  // 0 = success, 1 = denied, 2 = timeout, 3 = error, 4 = disabled
    @objc var errorMessage: SRString

    init(latitude: Double, longitude: Double, accuracy: Double, errorCode: Int32, errorMessage: String) {
        self.latitude = latitude
        self.longitude = longitude
        self.accuracy = accuracy
        self.errorCode = errorCode
        self.errorMessage = SRString(errorMessage)
    }
}

/// CLLocationManager delegate handler
class LocationDelegate: NSObject, CLLocationManagerDelegate {
    private let semaphore: DispatchSemaphore
    var result: LocationResult?

    init(semaphore: DispatchSemaphore) {
        self.semaphore = semaphore
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }

        result = LocationResult(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            accuracy: location.horizontalAccuracy,
            errorCode: 0,
            errorMessage: ""
        )

        manager.stopUpdatingLocation()
        semaphore.signal()
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let nsError = error as NSError

        if nsError.domain == kCLErrorDomain {
            switch CLError.Code(rawValue: nsError.code) {
            case .denied:
                result = LocationResult(
                    latitude: 0, longitude: 0, accuracy: 0,
                    errorCode: 1,
                    errorMessage: "Location access denied"
                )
            case .locationUnknown:
                result = LocationResult(
                    latitude: 0, longitude: 0, accuracy: 0,
                    errorCode: 3,
                    errorMessage: "Location unknown"
                )
            default:
                result = LocationResult(
                    latitude: 0, longitude: 0, accuracy: 0,
                    errorCode: 3,
                    errorMessage: error.localizedDescription
                )
            }
        } else {
            result = LocationResult(
                latitude: 0, longitude: 0, accuracy: 0,
                errorCode: 3,
                errorMessage: error.localizedDescription
            )
        }

        manager.stopUpdatingLocation()
        semaphore.signal()
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        // Handle authorization changes if needed
    }
}

/// Get authorization status from CLLocationManager (handles macOS version differences)
private func getAuthorizationStatus(_ manager: CLLocationManager) -> CLAuthorizationStatus {
    if #available(macOS 11.0, *) {
        return manager.authorizationStatus
    } else {
        return CLLocationManager.authorizationStatus()
    }
}

/// Check if location services are available and authorized
/// Returns: 0 = authorized, 1 = denied, 2 = not determined, 3 = restricted, 4 = services disabled
@_cdecl("check_location_authorization")
public func checkLocationAuthorization() -> Int32 {
    print("Swift: checkLocationAuthorization called")

    if !CLLocationManager.locationServicesEnabled() {
        print("Swift: Location services NOT enabled globally")
        return 4
    }

    print("Swift: Location services enabled globally")

    let manager = CLLocationManager()
    let status = getAuthorizationStatus(manager)
    print("Swift: Raw authorization status: \(status.rawValue)")

    switch status {
    case .authorizedAlways:
        print("Swift: Status = authorizedAlways")
        return 0
    case .denied:
        print("Swift: Status = denied")
        return 1
    case .notDetermined:
        print("Swift: Status = notDetermined")
        return 2
    case .restricted:
        print("Swift: Status = restricted")
        return 3
    @unknown default:
        print("Swift: Status = unknown (\(status.rawValue))")
        return 3
    }
}

/// Persistent location manager for authorization requests
/// Kept alive to ensure authorization dialogs are properly shown
private var authorizationManager: CLLocationManager?

/// Request location authorization
@_cdecl("request_location_authorization")
public func requestLocationAuthorization() {
    print("Swift: requestLocationAuthorization called (isMainThread: \(Thread.isMainThread))")

    // Execute on main thread safely
    runOnMain {
        // Create and store a persistent manager
        authorizationManager = CLLocationManager()
        authorizationManager?.requestAlwaysAuthorization()
        print("Swift: Requested always authorization")
    }

    // Give the system time to show the dialog
    Thread.sleep(forTimeInterval: 0.5)
}

/// Helper to run code on main thread safely, avoiding deadlock if already on main
private func runOnMain(_ block: @escaping () -> Void) {
    if Thread.isMainThread {
        block()
    } else {
        DispatchQueue.main.sync {
            block()
        }
    }
}

/// Get current location synchronously with timeout
/// Returns LocationResult with coordinates or error
@_cdecl("get_current_location")
public func getCurrentLocation() -> LocationResult {
    print("Swift: getCurrentLocation called (isMainThread: \(Thread.isMainThread))")

    // Check if services are enabled
    if !CLLocationManager.locationServicesEnabled() {
        print("Swift: Location services disabled globally")
        return LocationResult(
            latitude: 0, longitude: 0, accuracy: 0,
            errorCode: 4,
            errorMessage: "Location services disabled"
        )
    }

    let semaphore = DispatchSemaphore(value: 0)
    let delegate = LocationDelegate(semaphore: semaphore)
    var manager: CLLocationManager!

    // Must create CLLocationManager on main thread
    runOnMain {
        manager = CLLocationManager()
        manager.delegate = delegate
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    // Check authorization status
    let authStatus = getAuthorizationStatus(manager)
    print("Swift: Auth status before location request: \(authStatus.rawValue)")

    switch authStatus {
    case .denied, .restricted:
        print("Swift: Location access denied or restricted")
        return LocationResult(
            latitude: 0, longitude: 0, accuracy: 0,
            errorCode: 1,
            errorMessage: "Location access denied or restricted"
        )
    case .notDetermined:
        // Request authorization AND try to start location updates
        // On macOS, starting updates may trigger the authorization dialog
        print("Swift: Authorization not determined, requesting authorization and starting updates...")
        runOnMain {
            manager.requestAlwaysAuthorization()
            // Also try starting updates - this often triggers the dialog on macOS
            manager.startUpdatingLocation()
        }

        // Wait for user to respond to dialog (3 seconds)
        print("Swift: Waiting for user to respond to authorization dialog...")
        Thread.sleep(forTimeInterval: 3.0)

        // Check again after waiting
        let newStatus = getAuthorizationStatus(manager)
        print("Swift: Auth status after waiting: \(newStatus.rawValue)")

        if newStatus == .denied || newStatus == .restricted {
            runOnMain {
                manager.stopUpdatingLocation()
            }
            return LocationResult(
                latitude: 0, longitude: 0, accuracy: 0,
                errorCode: 1,
                errorMessage: "Location authorization denied"
            )
        } else if newStatus == .notDetermined {
            // Still not determined - dialog may not have appeared or user hasn't responded
            // Continue to wait for location updates which are already started
            print("Swift: Still not determined, waiting for location updates...")
        }
        // If authorized, continue to wait for updates (already started above)
    case .authorizedAlways:
        print("Swift: Already authorized, starting location updates...")
        runOnMain {
            manager.startUpdatingLocation()
        }
    @unknown default:
        print("Swift: Unknown auth status, trying anyway...")
        runOnMain {
            manager.startUpdatingLocation()
        }
    }

    // Wait for result with 10 second timeout
    print("Swift: Waiting for location result...")
    let timeout = DispatchTime.now() + .seconds(10)
    let waitResult = semaphore.wait(timeout: timeout)

    // Stop updates on main thread
    runOnMain {
        manager.stopUpdatingLocation()
    }

    if waitResult == .timedOut {
        print("Swift: Location request timed out")
        return LocationResult(
            latitude: 0, longitude: 0, accuracy: 0,
            errorCode: 2,
            errorMessage: "Location request timed out"
        )
    }

    if let result = delegate.result {
        print("Swift: Got location result - lat: \(result.latitude), lng: \(result.longitude), error: \(result.errorCode)")
        return result
    }

    print("Swift: No result received")
    return LocationResult(
        latitude: 0, longitude: 0, accuracy: 0,
        errorCode: 3,
        errorMessage: "Unknown error"
    )
}

/// Get macOS version as major.minor (e.g., 14.2 for Sonoma)
@_cdecl("get_macos_version")
public func getMacOSVersion() -> SRString {
    let version = ProcessInfo.processInfo.operatingSystemVersion
    return SRString("\(version.majorVersion).\(version.minorVersion)")
}
