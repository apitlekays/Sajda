import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

/**
 * REFACTORED:
 * This service previously handled the 1-minute interval loop for notifications.
 * That logic has been moved to Rust/Tauri Backend (scheduler.rs).
 * This file now only provides permission helpers.
 */

/**
 * @deprecated Reminder scheduling moved to Rust backend (scheduler.rs).
 * This function is a no-op and will be removed in v1.0.
 */
export const startReminderService = () => {
    console.warn("startReminderService is deprecated - Rust backend handles scheduling");
};

/**
 * @deprecated Reminder scheduling moved to Rust backend (scheduler.rs).
 * This function is a no-op and will be removed in v1.0.
 */
export const stopReminderService = () => {
    console.warn("stopReminderService is deprecated - Rust backend handles scheduling");
};

export const checkNotificationPermission = async (): Promise<boolean> => {
    return await isPermissionGranted();
};

export const requestNotificationPermission = async (): Promise<boolean> => {
    const permission = await requestPermission();
    return permission === 'granted';
};

export const triggerTestReminder = async () => {
    try {
        console.log("Triggering Test Notification (Rust)...");
        // Use Rust-native notification for testing click reliability
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('debug_delayed_notification', { delayMillis: 5000 });
    } catch (error) {
        console.error("Test failed", error);
    }
};
