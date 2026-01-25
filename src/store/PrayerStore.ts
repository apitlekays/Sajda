import { create } from "zustand";
import { LocationService } from "../utils/LocationService";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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
    nextPrayer: NextPrayer | null;
    _intervalId: number | null;
    _unlisteners: (() => void)[];
    _listenersInitialized: boolean;

    setZone: (zone: string) => void;
    fetchTimes: () => Promise<void>;
    updateCountdown: () => void;
    initializeListeners: () => Promise<void>;
    startLocationPolling: () => void;
    cleanup: () => void;
}

export const usePrayerStore = create<PrayerStore>((set, get) => ({
    zone: "WLY01",
    todayTimes: null,
    loading: false,
    nextPrayer: null,
    _intervalId: null,
    _unlisteners: [],
    _listenersInitialized: false,

    setZone: (zone) => set({ zone }),

    fetchTimes: async () => {
        set({ loading: true });
        try {
            // 1. Auto-detect Location & Push to Rust
            try {
                const { zone: detectedZone, lat, lng } = await LocationService.detectZone();
                console.log("Auto-detected Zone:", detectedZone, lat, lng);
                set({ zone: detectedZone });

                // Push Coords to Rust
                if (lat !== 0 || lng !== 0) {
                    await invoke("update_coordinates", { lat, lng });
                }
            } catch (e) {
                console.error("Zone detection failed", e);
            }

            // 2. Fetch Times from Rust
            const times = await invoke<PrayerTime>("get_prayers");
            console.log("Rust returned times:", times);

            set({ todayTimes: times || null, loading: false });

        } catch (error) {
            console.error(error);
            set({ loading: false });
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
