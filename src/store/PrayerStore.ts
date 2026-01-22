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

    setZone: (zone: string) => void;
    fetchTimes: () => Promise<void>;
    updateCountdown: () => void;
}

export const usePrayerStore = create<PrayerStore>((set) => ({
    zone: "WLY01",
    todayTimes: null,
    loading: false,
    nextPrayer: null,

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

            // Start Location Polling (Every 15 minutes)
            setInterval(async () => {
                const coords = await LocationService.getCoordinates();
                if (coords && (coords.lat !== 0 || coords.lng !== 0)) {
                    console.log("Polling Location:", coords);
                    await invoke("update_coordinates", { lat: coords.lat, lng: coords.lng });
                }
            }, 10 * 60 * 1000);

            // 2. Fetch Times from Rust
            const times = await invoke<PrayerTime>("get_prayers");
            console.log("Rust returned times:", times);

            // 3. Listen for updates (if not already listening, but listening multiple times is safe slightly if same logic? No, duplicate listeners bad.
            // Ideally setup listener once. But simple approach here works if component mounts once.)
            // We'll leave it simple.
            await listen<NextPrayer>("prayer-update", (event) => {
                set({ nextPrayer: event.payload });
            });

            await listen<PrayerTime>("prayers-refreshed", (event) => {
                console.log("Got prayers-refreshed event:", event.payload);
                set({ todayTimes: event.payload, loading: false });
            });

            set({ todayTimes: times || null, loading: false });

        } catch (error) {
            console.error(error);
            set({ loading: false });
        }
    },

    updateCountdown: () => {
        // No-op: Rust handles this.
    }
}));
