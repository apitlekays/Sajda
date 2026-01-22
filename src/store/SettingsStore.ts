import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';

const STORE_PATH = 'settings.json';

export type AudioMode = 'mute' | 'chime' | 'adhan';

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
}

const NEXT_MODE: Record<AudioMode, AudioMode> = {
    'mute': 'chime',
    'chime': 'adhan',
    'adhan': 'mute'
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
    audioSettings: {},
    remindersEnabled: true,
    isLoading: true,

    loadSettings: async () => {
        try {
            const store = await load(STORE_PATH);
            const val = await store.get<Record<string, AudioMode>>('audio_settings');
            const remindersVal = await store.get<boolean>('reminders_enabled');

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
                isLoading: false
            });
        } catch (e) {
            console.error("Failed to load settings store:", e);
            set({ isLoading: false });
        }
    },

    cycleAudioMode: async (prayerName) => {
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
    }
}));
