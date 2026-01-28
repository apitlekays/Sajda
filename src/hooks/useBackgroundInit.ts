import { useEffect, useRef } from "react";
import { useSettingsStore } from "../store/SettingsStore";
import { initAnalytics, trackAppOpen, trackError } from "../utils/Analytics";
import { LocationService } from "../utils/LocationService";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { enable as enableAutostart, isEnabled } from "@tauri-apps/plugin-autostart";

/**
 * Background initialization hook.
 * Runs fire-and-forget operations after settings are loaded.
 * Does NOT block the render cycle.
 */
export function useBackgroundInit() {
    const settingsLoading = useSettingsStore(state => state.isLoading);
    const hasRun = useRef(false);

    useEffect(() => {
        // Wait for settings to be loaded
        if (settingsLoading) return;

        // Prevent double execution in React StrictMode
        if (hasRun.current) return;
        hasRun.current = true;

        const runBackgroundInit = async () => {
            const { telemetryEnabled, setupComplete, completeSetup, setLocationEnabled, locationEnabled, checkAutostartStatus } = useSettingsStore.getState();

            // Fire-and-forget: Analytics initialization
            initAnalytics(telemetryEnabled)
                .then(() => trackAppOpen())
                .catch(e => console.warn("Analytics init failed:", e));

            // Fire-and-forget: Autostart status check
            checkAutostartStatus().catch((e: unknown) => console.warn("Autostart check failed:", e));

            // Fire-and-forget: Location authorization sync
            syncLocationAuth(setupComplete, locationEnabled, setLocationEnabled).catch(e => {
                console.error("Location auth sync failed:", e);
                trackError('location_permission', e instanceof Error ? e.message : 'Permission check failed');
            });

            // First-run setup (only if needed)
            if (!setupComplete) {
                handleFirstRunSetup(completeSetup).catch(e => {
                    console.error("First run setup failed:", e);
                });
            }
        };

        runBackgroundInit();
    }, [settingsLoading]);
}

/**
 * Sync location authorization status with system settings.
 * Fire-and-forget - doesn't block app startup.
 */
async function syncLocationAuth(
    setupComplete: boolean,
    locationEnabled: boolean,
    setLocationEnabled: (enabled: boolean) => Promise<void>
): Promise<void> {
    const nativeAvailable = await LocationService.isNativeLocationAvailable();
    console.log("[BackgroundInit] Native location available:", nativeAvailable);

    if (!nativeAvailable) {
        console.log("[BackgroundInit] Native location not available (requires macOS 10.15+) - will use IP fallback");
        return;
    }

    const authStatus = await LocationService.checkNativeLocationAuth();
    console.log("[BackgroundInit] Native auth status:", authStatus, "(0=authorized, 1=denied, 2=notDetermined, 3=restricted, 4=disabled)");

    if (authStatus === 2 && !setupComplete) {
        // First run and not determined - request authorization
        // Note: We do NOT wait 5 seconds here - the dialog shows in background
        console.log("[BackgroundInit] Requesting native location authorization...");
        await LocationService.requestNativeLocationAuth();

        // Check status after a short delay
        await new Promise(resolve => setTimeout(resolve, 500));
        const newStatus = await LocationService.checkNativeLocationAuth();
        console.log("[BackgroundInit] Auth status after request:", newStatus);

        if (newStatus === 0) {
            await setLocationEnabled(true);
            console.log("[BackgroundInit] Location authorization granted");
        }
    } else if (authStatus === 0) {
        // Already authorized
        if (!locationEnabled) {
            await setLocationEnabled(true);
            console.log("[BackgroundInit] Location authorized - enabling");
        }
    } else if (authStatus === 1 || authStatus === 3) {
        // Denied or restricted
        if (locationEnabled) {
            await setLocationEnabled(false);
            console.log("[BackgroundInit] Location denied/restricted - disabling");
        }
    }
}

/**
 * Handle first-run setup tasks.
 * Shows window and requests permissions.
 */
async function handleFirstRunSetup(
    completeSetup: () => Promise<void>
): Promise<void> {
    console.log("[BackgroundInit] First run detected - showing window and requesting permissions");

    const window = getCurrentWindow();
    await window.show();
    await window.setFocus();

    // Request notification permission
    const hasNotificationPermission = await isPermissionGranted();
    if (!hasNotificationPermission) {
        const permission = await requestPermission();
        console.log("[BackgroundInit] Notification permission:", permission);
    }

    // Enable autostart
    try {
        if (!(await isEnabled())) {
            await enableAutostart();
            console.log("[BackgroundInit] Autostart enabled");
        }
        useSettingsStore.getState().checkAutostartStatus();
    } catch (e) {
        console.warn("[BackgroundInit] Failed to enable autostart:", e);
    }

    // Mark setup as complete
    await completeSetup();
    console.log("[BackgroundInit] First run setup complete");
}
