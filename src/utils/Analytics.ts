/**
 * Analytics utility using PostHog
 *
 * PostHog is initialized via PostHogProvider in main.tsx.
 * Telemetry is opt-out by default (enabled unless user disables it).
 * Data is sent to PostHog EU for GDPR compliance.
 */

import posthog from 'posthog-js';
import { getVersion } from '@tauri-apps/api/app';
import { Platform } from './Platform';

let isEnabled = true;

/**
 * Initialize analytics preferences and set user properties
 * Called after settings are loaded to respect user's telemetry preference
 */
export async function initAnalytics(enabled: boolean = true): Promise<void> {
    isEnabled = enabled;

    if (!enabled) {
        posthog.opt_out_capturing();
        console.debug('Analytics: Opted out by user preference');
        return;
    }

    // Ensure capturing is enabled
    posthog.opt_in_capturing();

    try {
        const appVersion = await getVersion();

        // Set user properties with dynamic platform detection
        posthog.register({
            app_version: appVersion,
            platform: Platform.getPlatformName(),
            platform_display: Platform.getPlatformDisplayName(),
            app_name: 'Sajda',
        });

        console.debug('Analytics: Initialized with user properties');
    } catch (error) {
        console.debug('Analytics: Failed to set properties', error);
    }
}

/**
 * Enable or disable analytics
 */
export function setAnalyticsEnabled(enabled: boolean): void {
    isEnabled = enabled;

    if (enabled) {
        posthog.opt_in_capturing();
        console.debug('Analytics: Opted in');
    } else {
        posthog.opt_out_capturing();
        console.debug('Analytics: Opted out');
    }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
    return isEnabled;
}

// =============================================================================
// EVENT TRACKING
// =============================================================================

/**
 * Track app lifecycle events
 */
export function trackAppOpen(): void {
    if (!isEnabled) return;
    posthog.capture('app_opened');
}

export function trackAppClose(): void {
    if (!isEnabled) return;
    posthog.capture('app_closed');
}

/**
 * Track settings changes
 */
export function trackSettingChanged(setting: string, value: string | boolean | number): void {
    if (!isEnabled) return;
    posthog.capture('setting_changed', {
        setting_name: setting,
        setting_value: value,
    });
}

/**
 * Track audio mode changes
 */
export function trackAudioModeChanged(prayer: string, mode: string): void {
    if (!isEnabled) return;
    posthog.capture('audio_mode_changed', {
        prayer,
        mode,
    });
}

/**
 * Track prayer tracker interactions
 */
export function trackPrayerChecked(prayer: string, checked: boolean): void {
    if (!isEnabled) return;
    posthog.capture('prayer_checked', {
        prayer,
        checked,
    });
}

/**
 * Track reminder interactions
 */
export function trackReminderShown(type: 'hadith' | 'dua'): void {
    if (!isEnabled) return;
    posthog.capture('reminder_shown', { type });
}

export function trackReminderDismissed(): void {
    if (!isEnabled) return;
    posthog.capture('reminder_dismissed');
}

/**
 * Track prayer time notifications
 */
export function trackPrayerNotification(prayer: string, audioMode: string): void {
    if (!isEnabled) return;
    posthog.capture('prayer_notification', {
        prayer,
        audio_mode: audioMode,
    });
}

/**
 * Set user region from zone selection (anonymized to state/region level)
 */
export function setUserRegion(zone: string): void {
    if (!isEnabled) return;

    // Extract state from zone code (e.g., "WLY01" -> "WLY", "SGR01" -> "SGR")
    const stateCode = zone.replace(/[0-9]/g, '');

    // Map state codes to region names for better readability
    const stateMap: Record<string, string> = {
        'WLY': 'Wilayah Persekutuan',
        'SGR': 'Selangor',
        'JHR': 'Johor',
        'PHG': 'Pahang',
        'TRG': 'Terengganu',
        'KTN': 'Kelantan',
        'MLK': 'Melaka',
        'NSN': 'Negeri Sembilan',
        'PRK': 'Perak',
        'KDH': 'Kedah',
        'PLS': 'Perlis',
        'PNG': 'Pulau Pinang',
        'SBH': 'Sabah',
        'SWK': 'Sarawak',
        'LBN': 'Labuan',
    };

    const region = stateMap[stateCode] || stateCode;

    posthog.register({
        region,
        country: 'Malaysia',
    });
}

/**
 * Set calculation method
 */
export function setCalculationMethod(method: string): void {
    if (!isEnabled) return;
    posthog.register({
        calculation_method: method,
    });
}

/**
 * Track errors using PostHog's exception capture
 * This provides better error analysis with stack traces and error grouping
 */
export function trackError(errorType: string, errorMessage: string, error?: Error): void {
    if (!isEnabled) return;

    // Use captureException for proper error tracking
    const errorToCapture = error || new Error(errorMessage);
    posthog.captureException(errorToCapture, {
        error_type: errorType,
        error_message: errorMessage.substring(0, 200),
    });
}

/**
 * Flush any pending events (call before app closes)
 */
export function flushAnalytics(): void {
    if (!isEnabled) return;
    // PostHog batches events, this ensures they're sent
    posthog.capture('$flush');
}

// =============================================================================
// DEBUG FUNCTIONS (for testing analytics)
// =============================================================================

/**
 * Test error tracking - call from browser console: window.testAnalytics.testError()
 */
export function debugTestError(): void {
    console.log('Testing error tracking...');
    const testError = new Error('Test error from debugTestError()');
    trackError('debug_test_error', 'This is a test error for PostHog verification', testError);
    console.log('Error sent to PostHog. Check your PostHog dashboard.');
}

/**
 * Test event tracking - call from browser console: window.testAnalytics.testEvent()
 */
export function debugTestEvent(): void {
    console.log('Testing event tracking...');
    posthog.capture('debug_test_event', {
        test_property: 'test_value',
        timestamp: new Date().toISOString(),
    });
    console.log('Event sent to PostHog. Check your PostHog dashboard.');
}

/**
 * Check analytics status
 */
export function debugStatus(): { enabled: boolean; hasOptedOut: boolean } {
    const status = { enabled: isEnabled, hasOptedOut: posthog.has_opted_out_capturing() };
    console.log('Analytics status:', status);
    return status;
}

// Expose debug functions on window for console access
if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).testAnalytics = {
        testError: debugTestError,
        testEvent: debugTestEvent,
        status: debugStatus,
    };
}
