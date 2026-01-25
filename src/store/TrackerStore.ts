import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';
import { format } from 'date-fns';
import { trackError } from '../utils/Analytics';

// Define the store file path
const STORE_PATH = 'tracker.json';

interface TrackerState {
    // Key format: "YYYY-MM-DD" -> { fajr: true, dhuhr: false, ... }
    records: Record<string, Record<string, boolean>>;
    isLoading: boolean;

    // Actions
    loadRecords: () => Promise<void>;
    togglePrayer: (prayerName: string, dateStr?: string) => Promise<void>;
    isChecked: (prayerName: string, dateStr?: string) => boolean;
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
    records: {},
    isLoading: true,

    loadRecords: async () => {
        try {
            const store = await load(STORE_PATH);
            const val = await store.get<Record<string, Record<string, boolean>>>('records');
            if (val) {
                set({ records: val, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (e) {
            console.error("Failed to load tracker store:", e);
            trackError('tracker_load', e instanceof Error ? e.message : 'Failed to load tracker');
            set({ isLoading: false });
        }
    },

    togglePrayer: async (prayerName, dateStr) => {
        const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd');
        const { records } = get();

        const dayRecord = records[targetDate] || {};
        const currentState = dayRecord[prayerName] || false;

        const newRecords = {
            ...records,
            [targetDate]: {
                ...dayRecord,
                [prayerName]: !currentState
            }
        };

        set({ records: newRecords });

        // Persist
        try {
            const store = await load(STORE_PATH);
            await store.set('records', newRecords);
            await store.save();
        } catch (e) {
            console.error("Failed to save tracker:", e);
            trackError('tracker_save', e instanceof Error ? e.message : 'Failed to save tracker');
        }
    },

    isChecked: (prayerName, dateStr) => {
        const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd');
        const { records } = get();
        return records[targetDate]?.[prayerName] || false;
    }
}));
