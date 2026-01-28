import { create } from "zustand";
import { LocationService } from "../utils/LocationService";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { trackError } from "../utils/Analytics";

interface PrayerTime {
    fajr: number;
    syuruk: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
    hijri?: string; // Optional
    source?: string;
    zone_code?: string;
    zone_name?: string;
}

interface NextPrayer {
    name: string;
    time: string;
    remaining: string;
    timestamp: number;
}

interface PrayerStore {
    zone: string;
    todayTimes: PrayerTime | null;
    loading: boolean;
    isZoneLoading: boolean; // Background zone detection in progress
    nextPrayer: NextPrayer | null;
    _intervalId: number | null;
    _unlisteners: (() => void)[];
    _listenersInitialized: boolean;

    setZone: (zone: string) => void;
    fetchTimes: () => Promise<void>;
    detectZoneInBackground: () => Promise<void>;
    updateCountdown: () => void;
    initializeListeners: () => Promise<void>;
    startLocationPolling: () => void;
    cleanup: () => void;
}

const ZONE_CACHE_KEY = 'sajda_last_zone';

export const usePrayerStore = create<PrayerStore>((set, get) => ({
    zone: "WLY01",
    todayTimes: null,
    loading: false,
    isZoneLoading: false,
    nextPrayer: null,
    _intervalId: null,
    _unlisteners: [],
    _listenersInitialized: false,

    setZone: (zone) => set({ zone }),

    fetchTimes: async () => {
        set({ loading: true });

        try {
            // Phase 1: Use cached zone immediately (fast path)
            const cachedZone = localStorage.getItem(ZONE_CACHE_KEY) || 'WLY01';
            console.log("Using cached zone:", cachedZone);
            set({ zone: cachedZone });

            // Fetch times with cached zone (usually instant from Rust cache)
            const times = await invoke<PrayerTime>("get_prayers");
            console.log("Rust returned times:", times);
            set({ todayTimes: times || null, loading: false });

            // Phase 2: Background zone detection (fire-and-forget)
            get().detectZoneInBackground();

        } catch (error) {
            console.error("Prayer fetch error:", error);
            trackError('prayer_fetch', error instanceof Error ? error.message : 'Failed to fetch prayer times');
            set({ loading: false });

            // Still try background detection even if initial fetch failed
            get().detectZoneInBackground();
        }
    },

    detectZoneInBackground: async () => {
        const state = get();

        // Prevent concurrent zone detection
        if (state.isZoneLoading) {
            console.log("Zone detection already in progress, skipping");
            return;
        }

        set({ isZoneLoading: true });
        console.log("Starting background zone detection...");

        try {
            const { zone: detectedZone, lat, lng } = await LocationService.detectZone();
            const currentZone = get().zone;

            console.log(`Zone detection complete: detected=${detectedZone}, current=${currentZone}`);

            // Only update if zone actually changed
            if (detectedZone !== currentZone) {
                console.log(`Zone changed: ${currentZone} -> ${detectedZone}`);
                set({ zone: detectedZone });
                localStorage.setItem(ZONE_CACHE_KEY, detectedZone);

                // Update coordinates and refetch times
                if (lat !== 0 || lng !== 0) {
                    await invoke("update_coordinates", { lat, lng });
                    const times = await invoke<PrayerTime>("get_prayers");
                    console.log("Refreshed times after zone change:", times);
                    set({ todayTimes: times || null });
                }
            } else {
                // Zone same, still cache and update coords if available
                localStorage.setItem(ZONE_CACHE_KEY, detectedZone);
                if (lat !== 0 || lng !== 0) {
                    await invoke("update_coordinates", { lat, lng });
                }
            }
        } catch (e) {
            console.error("Background zone detection failed:", e);
            trackError('location_detection', e instanceof Error ? e.message : 'Zone detection failed');
        } finally {
            set({ isZoneLoading: false });
        }
    },

    initializeListeners: async () => {
        const state = get();

        // Prevent duplicate listener registration
        if (state._listenersInitialized) {
            console.log("Listeners already initialized, skipping");
            return;
        }

        const unlistenPrayer = await listen<NextPrayer>("prayer-update", (event) => {
            set({ nextPrayer: event.payload });
        });

        const unlistenRefresh = await listen<PrayerTime>("prayers-refreshed", (event) => {
            console.log("Got prayers-refreshed event:", event.payload);
            set({ todayTimes: event.payload, loading: false });
        });

        set({
            _unlisteners: [unlistenPrayer, unlistenRefresh],
            _listenersInitialized: true
        });
        console.log("Prayer store listeners initialized");
    },

    startLocationPolling: () => {
        const state = get();

        // Prevent duplicate intervals
        if (state._intervalId !== null) {
            console.log("Location polling already active, skipping");
            return;
        }

        const intervalId = window.setInterval(async () => {
            const coords = await LocationService.getCoordinates();
            if (coords && (coords.lat !== 0 || coords.lng !== 0)) {
                console.log("Polling Location:", coords);
                await invoke("update_coordinates", { lat: coords.lat, lng: coords.lng });
            }
        }, 10 * 60 * 1000); // 10 minutes

        set({ _intervalId: intervalId });
        console.log("Location polling started with interval ID:", intervalId);
    },

    cleanup: () => {
        const state = get();

        // Clear interval
        if (state._intervalId !== null) {
            clearInterval(state._intervalId);
            console.log("Location polling stopped");
        }

        // Call all unlisten functions
        state._unlisteners.forEach(unlisten => unlisten());
        console.log("Prayer store listeners cleaned up");

        set({
            _intervalId: null,
            _unlisteners: [],
            _listenersInitialized: false
        });
    },

    updateCountdown: () => {
        // No-op: Rust handles this.
    }
}));
