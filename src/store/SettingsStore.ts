import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';
import { trackError } from '../utils/Analytics';

const STORE_PATH = 'settings.json';

export type AudioMode = 'mute' | 'chime' | 'adhan';
export type AdhanVoice = 'Nasser' | 'Ahmed';

export type LocationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

interface SettingsState {
    // Key: prayer name (fajr, etc), Value: mode
    audioSettings: Record<string, AudioMode>;
    isLoading: boolean;

    loadSettings: () => Promise<void>;
    cycleAudioMode: (prayerName: string) => Promise<void>;
    getMode: (prayerName: string) => AudioMode;

    // Reminders
    remindersEnabled: boolean;
    toggleReminders: () => Promise<void>;

    randomReminders: boolean;
    toggleRandomReminders: () => Promise<void>;

    reminderTimes: string[]; // ["09:00", "21:00"]
    addReminderTime: (time: string) => Promise<void>;
    removeReminderTime: (time: string) => Promise<void>;

    alkahfEnabled: boolean;
    toggleAlKahf: () => Promise<void>;

    ramadhanCountdown: boolean;
    toggleRamadhanCountdown: () => Promise<void>;

    // Adhan Voice
    adhanSelection: AdhanVoice;
    setAdhanSelection: (voice: AdhanVoice) => Promise<void>;

    // Calculation Method
    calculationMethod: string;
    setCalculationMethod: (method: string) => Promise<void>;

    // Location Services
    locationEnabled: boolean;
    locationPermissionStatus: LocationPermissionStatus;
    setLocationEnabled: (enabled: boolean) => Promise<void>;
    toggleLocation: () => Promise<{ success: boolean; status: LocationPermissionStatus }>;
    checkLocationPermission: () => Promise<LocationPermissionStatus>;

    // Telemetry (opt-out, enabled by default)
    telemetryEnabled: boolean;
    toggleTelemetry: () => Promise<void>;

    // First-run setup
    setupComplete: boolean;
    completeSetup: () => Promise<void>;
}

const NEXT_MODE: Record<AudioMode, AudioMode> = {
    'mute': 'chime',
    'chime': 'adhan',
    'adhan': 'mute'
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
    audioSettings: {},
    remindersEnabled: true,
    randomReminders: true,
    reminderTimes: ["09:00", "21:00"],
    alkahfEnabled: true,
    ramadhanCountdown: true,
    telemetryEnabled: true, // Opt-out: enabled by default
    setupComplete: false, // First-run detection

    adhanSelection: 'Nasser',
    calculationMethod: 'JAKIM',
    isLoading: true,

    // Location Services
    locationEnabled: false, // Default to false until permission granted
    locationPermissionStatus: 'unknown',

    loadSettings: async () => {
        try {
            const store = await load(STORE_PATH);
            const val = await store.get<Record<string, AudioMode>>('audio_settings');
            const remindersVal = await store.get<boolean>('reminders_enabled');
            const randomRemindersVal = await store.get<boolean>('random_reminders');
            const reminderTimesVal = await store.get<string[]>('reminder_times');
            const alkahfVal = await store.get<boolean>('alkahf_enabled');
            const ramadhanVal = await store.get<boolean>('ramadhan_countdown');
            const adhanVal = await store.get<AdhanVoice>('adhan_selection');
            const calcVal = await store.get<string>('calculation_method');
            const telemetryVal = await store.get<boolean>('telemetry_enabled');
            const setupCompleteVal = await store.get<boolean>('setup_complete');
            const locationEnabledVal = await store.get<boolean>('location_enabled');

            set({
                audioSettings: val || {
                    fajr: 'adhan',
                    syuruk: 'mute',
                    dhuhr: 'adhan',
                    asr: 'adhan',
                    maghrib: 'adhan',
                    isha: 'adhan'
                },
                remindersEnabled: remindersVal !== null ? remindersVal : true, // Default ON
                randomReminders: randomRemindersVal !== null ? randomRemindersVal : true,
                reminderTimes: reminderTimesVal || ["09:00", "21:00"],
                alkahfEnabled: alkahfVal !== null ? alkahfVal : true,
                ramadhanCountdown: ramadhanVal !== null ? ramadhanVal : true,
                adhanSelection: adhanVal || 'Nasser', // Default to Nasser
                calculationMethod: calcVal || 'JAKIM',
                telemetryEnabled: telemetryVal !== null ? telemetryVal : true, // Opt-out: default ON
                setupComplete: setupCompleteVal === true, // Only true if explicitly set
                locationEnabled: locationEnabledVal === true, // Only true if explicitly granted
                isLoading: false
            });
        } catch (e) {
            console.error("Failed to load settings store:", e);
            trackError('settings_load', e instanceof Error ? e.message : 'Unknown error');
            set({ isLoading: false });
        }
    },

    cycleAudioMode: async (prayerName) => {
        if (prayerName === 'syuruk') return; // Syuruk always silent

        const { audioSettings } = get();
        const current = audioSettings[prayerName] || 'mute';
        const next = NEXT_MODE[current];

        const newSettings = {
            ...audioSettings,
            [prayerName]: next
        };

        set({ audioSettings: newSettings });

        // Persist
        try {
            const store = await load(STORE_PATH);
            await store.set('audio_settings', newSettings);
            await store.save();
        } catch (e) {
            console.error("Failed to save settings:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save audio settings');
        }
    },

    getMode: (prayerName) => {
        const { audioSettings } = get();
        return audioSettings[prayerName] || 'mute';
    },

    toggleReminders: async () => {
        const { remindersEnabled } = get();
        const newState = !remindersEnabled;
        set({ remindersEnabled: newState });

        try {
            const store = await load(STORE_PATH);
            await store.set('reminders_enabled', newState);
            await store.save();
        } catch (e) {
            console.error("Failed to save reminders settings:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save reminders');
        }
    },

    toggleRandomReminders: async () => {
        const { randomReminders } = get();
        const newState = !randomReminders;
        set({ randomReminders: newState });

        try {
            const store = await load(STORE_PATH);
            await store.set('random_reminders', newState);
            await store.save();
        } catch (e) {
            console.error("Failed to save random reminders setting:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save random reminders');
        }
    },

    addReminderTime: async (time) => {
        const { reminderTimes } = get();
        if (reminderTimes.includes(time)) return;
        const newTimes = [...reminderTimes, time].sort();
        set({ reminderTimes: newTimes });

        try {
            const store = await load(STORE_PATH);
            await store.set('reminder_times', newTimes);
            await store.save();
        } catch (e) {
            console.error("Failed to save reminder times:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save reminder times');
        }
    },

    removeReminderTime: async (time) => {
        const { reminderTimes } = get();
        const newTimes = reminderTimes.filter(t => t !== time);
        set({ reminderTimes: newTimes });

        try {
            const store = await load(STORE_PATH);
            await store.set('reminder_times', newTimes);
            await store.save();
        } catch (e) {
            console.error("Failed to save reminder times:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to remove reminder time');
        }
    },

    toggleAlKahf: async () => {
        const { alkahfEnabled } = get();
        const newState = !alkahfEnabled;
        set({ alkahfEnabled: newState });

        try {
            const store = await load(STORE_PATH);
            await store.set('alkahf_enabled', newState);
            await store.save();
        } catch (e) {
            console.error("Failed to save alkahf settings:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save alkahf');
        }
    },

    toggleRamadhanCountdown: async () => {
        const { ramadhanCountdown } = get();
        const newState = !ramadhanCountdown;
        set({ ramadhanCountdown: newState });

        try {
            const store = await load(STORE_PATH);
            await store.set('ramadhan_countdown', newState);
            await store.save();
        } catch (e) {
            console.error("Failed to save ramadhan countdown setting:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save ramadhan countdown');
        }
    },

    setAdhanSelection: async (voice) => {
        set({ adhanSelection: voice });
        try {
            const store = await load(STORE_PATH);
            await store.set('adhan_selection', voice);
            await store.save();
        } catch (e) {
            console.error("Failed to save adhan selection:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save adhan selection');
        }
    },

    setCalculationMethod: async (method) => {
        set({ calculationMethod: method });
        try {
            // 1. Save to Disk
            const store = await load(STORE_PATH);
            await store.set('calculation_method', method);
            await store.save();

            // 2. Notify Rust Backend Immediately
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('update_calculation_method', { method });
        } catch (e) {
            console.error("Failed to set calculation method:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save calculation method');
        }
    },

    toggleTelemetry: async () => {
        const { telemetryEnabled } = get();
        const newState = !telemetryEnabled;
        set({ telemetryEnabled: newState });

        // Update analytics state
        const { setAnalyticsEnabled } = await import('../utils/Analytics');
        setAnalyticsEnabled(newState);

        try {
            const store = await load(STORE_PATH);
            await store.set('telemetry_enabled', newState);
            await store.save();
        } catch (e) {
            console.error("Failed to save telemetry setting:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save telemetry');
        }
    },

    completeSetup: async () => {
        set({ setupComplete: true });
        try {
            const store = await load(STORE_PATH);
            await store.set('setup_complete', true);
            await store.save();
        } catch (e) {
            console.error("Failed to save setup complete flag:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save setup complete');
        }
    },

    // Location Services
    setLocationEnabled: async (enabled) => {
        set({ locationEnabled: enabled });
        try {
            const store = await load(STORE_PATH);
            await store.set('location_enabled', enabled);
            await store.save();
        } catch (e) {
            console.error("Failed to save location enabled setting:", e);
            trackError('settings_save', e instanceof Error ? e.message : 'Failed to save location enabled');
        }
    },

    checkLocationPermission: async () => {
        try {
            const { checkPermissions } = await import('@tauri-apps/plugin-geolocation');
            const permission = await checkPermissions();
            const rawStatus = permission.location;
            // Map 'prompt-with-rationale' to 'prompt' for our simpler type
            const status: LocationPermissionStatus = rawStatus === 'prompt-with-rationale' ? 'prompt' :
                (rawStatus === 'granted' || rawStatus === 'denied' || rawStatus === 'prompt') ? rawStatus : 'unknown';
            set({ locationPermissionStatus: status });
            return status;
        } catch (e) {
            console.error("Failed to check location permission:", e);
            set({ locationPermissionStatus: 'unknown' });
            return 'unknown';
        }
    },

    toggleLocation: async () => {
        const { locationEnabled, setLocationEnabled } = get();

        // If currently enabled, just disable it
        if (locationEnabled) {
            await setLocationEnabled(false);
            return { success: true, status: 'denied' as LocationPermissionStatus };
        }

        // If trying to enable, check current permission status
        try {
            const { checkPermissions, requestPermissions } = await import('@tauri-apps/plugin-geolocation');
            const currentPermission = await checkPermissions();
            const currentStatus = currentPermission.location;

            if (currentStatus === 'granted') {
                // Permission already granted, just enable
                await setLocationEnabled(true);
                set({ locationPermissionStatus: 'granted' });
                return { success: true, status: 'granted' };
            } else if (currentStatus === 'prompt' || currentStatus === 'prompt-with-rationale') {
                // Request permission from user
                const result = await requestPermissions(['location']);
                const newStatus = result.location as LocationPermissionStatus;

                if (newStatus === 'granted') {
                    await setLocationEnabled(true);
                    set({ locationPermissionStatus: 'granted' });
                    return { success: true, status: 'granted' };
                } else {
                    // User denied
                    set({ locationPermissionStatus: 'denied' });
                    return { success: false, status: 'denied' };
                }
            } else if (currentStatus === 'denied') {
                // Permission was previously denied - user needs to go to System Settings
                set({ locationPermissionStatus: 'denied' });
                return { success: false, status: 'denied' };
            }

            return { success: false, status: 'unknown' };
        } catch (e) {
            console.error("Failed to toggle location:", e);
            trackError('location_toggle', e instanceof Error ? e.message : 'Failed to toggle location');
            return { success: false, status: 'unknown' };
        }
    }
}));
