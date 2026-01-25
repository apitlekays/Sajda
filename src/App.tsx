import { useEffect } from "react";
import "./App.css";
import { Dashboard } from "./components/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useTrackerStore } from "./store/TrackerStore";
import { useSettingsStore } from "./store/SettingsStore";
import { initAnalytics, trackAppOpen, flushAnalytics, trackError } from "./utils/Analytics";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { checkPermissions, requestPermissions } from "@tauri-apps/plugin-geolocation";

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

        // Request location permission (crucial for accurate prayer times)
        try {
          const locationPermission = await checkPermissions();
          console.log("Location permission status:", locationPermission.location);

          if (locationPermission.location === 'prompt' || locationPermission.location === 'prompt-with-rationale') {
            // Request location permission - macOS will show system dialog
            // explaining why the app needs location access
            const result = await requestPermissions(['location']);
            console.log("Location permission result:", result.location);

            // Update settings based on permission result
            const { setLocationEnabled } = useSettingsStore.getState();
            if (result.location === 'granted') {
              await setLocationEnabled(true);
            } else {
              // User denied - will use IP fallback
              await setLocationEnabled(false);
              console.log("Location denied - will use IP-based geolocation fallback");
            }
          } else if (locationPermission.location === 'granted') {
            const { setLocationEnabled } = useSettingsStore.getState();
            await setLocationEnabled(true);
          }
        } catch (e) {
          console.error("Location permission request failed:", e);
          trackError('location_permission', e instanceof Error ? e.message : 'Permission request failed');
        }

        // Mark setup as complete
        await completeSetup();
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
