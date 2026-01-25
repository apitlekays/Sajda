/**
 * Analytics utility using PostHog
 *
 * Telemetry is opt-out by default (enabled unless user disables it).
 * Data is sent to PostHog EU for GDPR compliance.
 */

import posthog from 'posthog-js';
import { getVersion } from '@tauri-apps/api/app';

const POSTHOG_KEY = 'phc_8fg0KsOQwSC7R0bPcIE0geAGi49SXfG6ejU5oVNkXWw';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

let isInitialized = false;
let isEnabled = true;

/**
 * Initialize PostHog analytics
 * Should be called once on app startup
 */
export async function initAnalytics(enabled: boolean = true): Promise<void> {
    isEnabled = enabled;

    if (!enabled) {
        console.debug('Analytics: Disabled by user preference');
        return;
    }

    if (isInitialized) {
        return;
    }

    try {
        const appVersion = await getVersion();

        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            persistence: 'localStorage',
            autocapture: false, // We'll manually track events
            capture_pageview: false, // Not a web app
            capture_pageleave: false,
            disable_session_recording: true,
            bootstrap: {
                distinctID: undefined, // Let PostHog generate anonymous ID
            },
        });

        // Set initial user properties
        posthog.register({
            app_version: appVersion,
            platform: 'macos',
            app_name: 'Sajda',
        });

        isInitialized = true;
        console.debug('Analytics: Initialized successfully');
    } catch (error) {
        console.debug('Analytics: Failed to initialize', error);
    }
}

/**
 * Enable or disable analytics
 */
export function setAnalyticsEnabled(enabled: boolean): void {
    isEnabled = enabled;

    if (enabled && !isInitialized) {
        initAnalytics(true);
    } else if (!enabled && isInitialized) {
        posthog.opt_out_capturing();
        console.debug('Analytics: Opted out');
    } else if (enabled && isInitialized) {
        posthog.opt_in_capturing();
        console.debug('Analytics: Opted back in');
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
    if (!isEnabled || !isInitialized) return;
    posthog.capture('app_opened');
}

export function trackAppClose(): void {
    if (!isEnabled || !isInitialized) return;
    posthog.capture('app_closed');
}

/**
 * Track settings changes
 */
export function trackSettingChanged(setting: string, value: string | boolean | number): void {
    if (!isEnabled || !isInitialized) return;
    posthog.capture('setting_changed', {
        setting_name: setting,
        setting_value: value,
    });
}

/**
 * Track audio mode changes
 */
export function trackAudioModeChanged(prayer: string, mode: string): void {
    if (!isEnabled || !isInitialized) return;
    posthog.capture('audio_mode_changed', {
        prayer,
        mode,
    });
}

/**
 * Track prayer tracker interactions
 */
export function trackPrayerChecked(prayer: string, checked: boolean): void {
    if (!isEnabled || !isInitialized) return;
    posthog.capture('prayer_checked', {
        prayer,
        checked,
    });
}

/**
 * Track reminder interactions
 */
export function trackReminderShown(type: 'hadith' | 'dua'): void {
    if (!isEnabled || !isInitialized) return;
    posthog.capture('reminder_shown', { type });
}

export function trackReminderDismissed(): void {
    if (!isEnabled || !isInitialized) return;
    posthog.capture('reminder_dismissed');
}

/**
 * Track prayer time notifications
 */
export function trackPrayerNotification(prayer: string, audioMode: string): void {
    if (!isEnabled || !isInitialized) return;
    posthog.capture('prayer_notification', {
        prayer,
        audio_mode: audioMode,
    });
}

/**
 * Set user region from zone selection (anonymized to state/region level)
 */
export function setUserRegion(zone: string): void {
    if (!isEnabled || !isInitialized) return;

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
    if (!isEnabled || !isInitialized) return;
    posthog.register({
        calculation_method: method,
    });
}

/**
 * Track errors (non-PII)
 */
export function trackError(errorType: string, errorMessage: string): void {
    if (!isEnabled || !isInitialized) return;
    posthog.capture('error_occurred', {
        error_type: errorType,
        error_message: errorMessage.substring(0, 100), // Truncate for safety
    });
}

/**
 * Flush any pending events (call before app closes)
 */
export function flushAnalytics(): void {
    if (!isEnabled || !isInitialized) return;
    // PostHog batches events, this ensures they're sent
    posthog.capture('$flush');
}
