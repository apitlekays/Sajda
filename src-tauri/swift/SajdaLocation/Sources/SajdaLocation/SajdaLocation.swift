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
    private let authSemaphore: DispatchSemaphore?
    var result: LocationResult?
    var authorizationChanged = false

    init(semaphore: DispatchSemaphore, authSemaphore: DispatchSemaphore? = nil) {
        self.semaphore = semaphore
        self.authSemaphore = authSemaphore
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
        print("Swift: Authorization changed to: \(getAuthorizationStatus(manager).rawValue)")
        authorizationChanged = true
        // Signal the auth semaphore if we're waiting for authorization
        authSemaphore?.signal()
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
    let authSemaphore = DispatchSemaphore(value: 0)
    let delegate = LocationDelegate(semaphore: semaphore, authSemaphore: authSemaphore)
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
        // Request authorization ONLY - don't start updates until authorized
        print("Swift: Authorization not determined, requesting authorization...")
        runOnMain {
            manager.requestAlwaysAuthorization()
        }

        // Wait for authorization callback (up to 10 seconds)
        print("Swift: Waiting for user to respond to authorization dialog...")
        let authTimeout = DispatchTime.now() + .seconds(10)
        let authWaitResult = authSemaphore.wait(timeout: authTimeout)

        if authWaitResult == .timedOut {
            print("Swift: Authorization dialog timed out - user hasn't responded yet")
            return LocationResult(
                latitude: 0, longitude: 0, accuracy: 0,
                errorCode: 5,
                errorMessage: "Authorization pending - user hasn't responded to dialog"
            )
        }

        // Check the new status after user responded
        let newStatus = getAuthorizationStatus(manager)
        print("Swift: Auth status after user response: \(newStatus.rawValue)")

        if newStatus == .authorizedAlways {
            print("Swift: Authorization granted, now starting location updates...")
            runOnMain {
                manager.startUpdatingLocation()
            }
        } else if newStatus == .denied || newStatus == .restricted {
            print("Swift: User denied location access")
            return LocationResult(
                latitude: 0, longitude: 0, accuracy: 0,
                errorCode: 1,
                errorMessage: "Location authorization denied by user"
            )
        } else {
            // Still not determined somehow
            print("Swift: Authorization still not determined after callback")
            return LocationResult(
                latitude: 0, longitude: 0, accuracy: 0,
                errorCode: 5,
                errorMessage: "Authorization not determined"
            )
        }
    case .authorizedAlways:
        print("Swift: Already authorized, starting location updates...")
        runOnMain {
            manager.startUpdatingLocation()
        }
    @unknown default:
        print("Swift: Unknown auth status (\(authStatus.rawValue)), trying anyway...")
        runOnMain {
            manager.startUpdatingLocation()
        }
    }

    // Wait for location result with 10 second timeout
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
