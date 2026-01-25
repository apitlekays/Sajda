import { useEffect } from "react";
import "./App.css";
import { Dashboard } from "./components/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useTrackerStore } from "./store/TrackerStore";
import { useSettingsStore } from "./store/SettingsStore";
import { initAnalytics, trackAppOpen, flushAnalytics, trackError } from "./utils/Analytics";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { enable as enableAutostart } from "@tauri-apps/plugin-autostart";
import { LocationService } from "./utils/LocationService";

function App() {
  const { loadRecords } = useTrackerStore();
  const { loadSettings } = useSettingsStore();

  useEffect(() => {
    // Load persisted data on mount
    loadRecords();
    loadSettings().then(async () => {
      const { telemetryEnabled, setupComplete, completeSetup } = useSettingsStore.getState();

      // First-run setup: show window and request permissions
      if (!setupComplete) {
        console.log("First run detected - showing window and requesting permissions");
        const window = getCurrentWindow();
        await window.show();
        await window.setFocus();

        // Request notification permission
        const hasNotificationPermission = await isPermissionGranted();
        if (!hasNotificationPermission) {
          const permission = await requestPermission();
          console.log("Notification permission:", permission);
        }

        // Enable autostart so app launches on login
        try {
          await enableAutostart();
          console.log("Autostart enabled for next login");
        } catch (e) {
          console.warn("Failed to enable autostart:", e);
        }

        // Mark setup as complete
        await completeSetup();
      }

      // Always check location authorization on every launch
      // This ensures locationEnabled stays in sync with actual system authorization
      try {
        const nativeAvailable = await LocationService.isNativeLocationAvailable();
        console.log("[App] Native location available:", nativeAvailable);

        const { setLocationEnabled, locationEnabled } = useSettingsStore.getState();
        console.log("[App] Current locationEnabled setting:", locationEnabled);

        if (nativeAvailable) {
          const authStatus = await LocationService.checkNativeLocationAuth();
          console.log("[App] Native location auth status:", authStatus, "(0=authorized, 1=denied, 2=notDetermined, 3=restricted, 4=disabled)");

          if (authStatus === 2 && !setupComplete) {
            // First run and not determined - request authorization (will show system dialog)
            console.log("[App] Requesting native location authorization...");
            await LocationService.requestNativeLocationAuth();

            // Wait for user to respond
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check status again
            const newStatus = await LocationService.checkNativeLocationAuth();
            console.log("[App] New auth status after request:", newStatus);
            if (newStatus === 0) {
              await setLocationEnabled(true);
              console.log("[App] Location authorization granted - enabled");
            } else {
              await setLocationEnabled(false);
              console.log("[App] Location authorization not granted - will use IP fallback");
            }
          } else if (authStatus === 0) {
            // Already authorized - ensure locationEnabled is true
            if (!locationEnabled) {
              await setLocationEnabled(true);
              console.log("[App] Location already authorized in System Settings - enabling");
            } else {
              console.log("[App] Location already authorized and enabled");
            }
          } else {
            // Denied or restricted - ensure locationEnabled is false
            if (locationEnabled) {
              await setLocationEnabled(false);
              console.log("[App] Location denied/restricted in System Settings - disabling");
            } else {
              console.log("[App] Location denied/restricted - will use IP fallback");
            }
          }
        } else {
          // macOS < 10.15 - native location not available
          console.log("[App] Native location not available (requires macOS 10.15+) - will use IP fallback");
        }
      } catch (e) {
        console.error("[App] Location permission check failed:", e);
        trackError('location_permission', e instanceof Error ? e.message : 'Permission check failed');
      }

      // Initialize analytics after settings are loaded (to get telemetry preference)
      initAnalytics(telemetryEnabled).then(() => {
        trackAppOpen();
      });
    });

    // Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);

    // Flush analytics on app close
    const handleBeforeUnload = () => {
      flushAnalytics();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Global error handlers for uncaught errors
    const handleError = (event: ErrorEvent) => {
      trackError('uncaught_error', event.message, event.error);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      trackError('unhandled_rejection', error.message, error);
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      flushAnalytics();
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-transparent overflow-hidden select-none font-sans text-foreground">
        {/* Main Application Container */}
        <div className="h-full w-full flex flex-col bg-background/95 backdrop-blur-3xl shadow-2xl border border-white/10 relative overflow-hidden">
          <Dashboard />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
