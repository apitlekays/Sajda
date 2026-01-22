import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';

const STORE_PATH = 'settings.json';

export type AudioMode = 'mute' | 'chime' | 'adhan';
export type AdhanVoice = 'Nasser' | 'Ahmed';

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

    reminderTimes: string[]; // ["09:00", "21:00"]
    addReminderTime: (time: string) => Promise<void>;
    removeReminderTime: (time: string) => Promise<void>;

    alkahfEnabled: boolean;
    toggleAlKahf: () => Promise<void>;

    // Adhan Voice
    adhanSelection: AdhanVoice;
    setAdhanSelection: (voice: AdhanVoice) => Promise<void>;

    // Calculation Method
    calculationMethod: string;
    setCalculationMethod: (method: string) => Promise<void>;
}

const NEXT_MODE: Record<AudioMode, AudioMode> = {
    'mute': 'chime',
    'chime': 'adhan',
    'adhan': 'mute'
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
    audioSettings: {},
    remindersEnabled: true,
    reminderTimes: ["09:00", "21:00"],
    alkahfEnabled: true,

    adhanSelection: 'Nasser',
    calculationMethod: 'JAKIM',
    isLoading: true,

    loadSettings: async () => {
        try {
            const store = await load(STORE_PATH);
            const val = await store.get<Record<string, AudioMode>>('audio_settings');
            const remindersVal = await store.get<boolean>('reminders_enabled');
            const reminderTimesVal = await store.get<string[]>('reminder_times');
            const alkahfVal = await store.get<boolean>('alkahf_enabled');
            const adhanVal = await store.get<AdhanVoice>('adhan_selection');
            const calcVal = await store.get<string>('calculation_method');

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
                reminderTimes: reminderTimesVal || ["09:00", "21:00"],
                alkahfEnabled: alkahfVal !== null ? alkahfVal : true,
                adhanSelection: adhanVal || 'Nasser', // Default to Nasser
                calculationMethod: calcVal || 'JAKIM',
                isLoading: false
            });
        } catch (e) {
            console.error("Failed to load settings store:", e);
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
        }
    }
}));
