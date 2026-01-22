import { create } from "zustand";
import { LocationService, PrayerTime } from "../utils/LocationService";
import { format, isAfter } from "date-fns";
import { invoke } from "@tauri-apps/api/core";

interface PrayerStore {
    zone: string;
    times: PrayerTime[]; // usually returns array for the week/year
    todayTimes: PrayerTime | null;
    loading: boolean;
    nextPrayer: { name: string; time: string; remaining: string } | null;
    lastPlayed: string | null;
    setZone: (zone: string) => void;
    fetchTimes: () => Promise<void>;
    updateCountdown: () => void;
}

export const usePrayerStore = create<PrayerStore>((set, get) => ({
    zone: "WLY01", // Default KL
    times: [],
    todayTimes: null,
    loading: false,
    nextPrayer: null,

    lastPlayed: null, // Track last played prayer to prevent loops

    setZone: (zone) => set({ zone }),

    fetchTimes: async () => {
        // ... existing fetchTimes logic ...
        set({ loading: true });
        try {
            // Auto-detect zone first
            try {
                const detectedZone = await LocationService.detectZone();
                console.log("Auto-detected Zone:", detectedZone);
                set({ zone: detectedZone });
            } catch (e) {
                console.error("Zone detection failed, using current:", get().zone);
            }

            const { zone } = get();
            const times = await LocationService.getPrayerTimes(zone);
            // ... (rest of fetchTimes logic unchanged logic finding todayData) ...

            // Re-implementing simplified for safety since I'm overwriting large chunk? 
            // Better to use multi-replace or careful single replace.
            // I'll stick to replacing the whole updateCountdown logic or the store definition.

            // ...

            // Let's use get() to find todayData more reliably or re-use existing code?
            // "times" is local here.

            // ... (rest of fetch logic) ...

            // Copying existing logic for safety:
            const now = new Date();
            const dayOfMonth = now.getDate();
            const todayData = times.find(p => {
                if (typeof p.day === 'number') return p.day === dayOfMonth;
                const fajrDate = new Date(p.fajr * 1000);
                return fajrDate.getDate() === dayOfMonth && fajrDate.getMonth() === now.getMonth();
            }) || times[0];

            set({ times, todayTimes: todayData || null, loading: false });
            get().updateCountdown();
        } catch (error) {
            console.error(error);
            set({ loading: false });
        }
    },

    updateCountdown: () => {
        const { times, lastPlayed } = get();
        if (!times || times.length === 0) return;

        const now = new Date();
        const prayerNames = ["fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];

        // Find today's data (simple find)
        const dayOfMonth = now.getDate();
        const todayData = times.find(p => {
            if (typeof p.day === 'number') return p.day === dayOfMonth;
            // fallback check
            const fajrDate = new Date(p.fajr * 1000);
            return fajrDate.getDate() === dayOfMonth && fajrDate.getMonth() === now.getMonth();
        }) || times[0];

        if (!todayData) return;

        const getPrayerDate = (prayerTimeObj: PrayerTime, prayerName: string) => {
            // @ts-ignore
            const val = prayerTimeObj[prayerName] as number;
            return new Date(val * 1000);
        };

        // Check for Audio Trigger (Current Prayer)
        for (const name of prayerNames) {
            const prayerDate = getPrayerDate(todayData, name);
            const diff = now.getTime() - prayerDate.getTime();

            // If passed within last 2 seconds AND not already played
            if (diff >= 0 && diff < 2000) {
                if (lastPlayed !== name) {
                    console.log(`Triggering Audio for ${name}`);
                    // Import AudioService dynamically or assumes global? 
                    // Better to import at top of file.
                    // Call AudioService
                    import("../utils/AudioService").then(({ AudioService }) => {
                        AudioService.playAthan(name);
                    });

                    set({ lastPlayed: name });
                }
            } else {
                // Reset lastPlayed if we are far past it? 
                // Actually no, we just want to avoid re-triggering SAME prayer.
                // Ideally we reset `lastPlayed` significantly later or let it persist until next day?
                // Simple logic: `lastPlayed` just tracks the last one.
            }
        }

        // ... (Existing Next Prayer Logic) ...

        let next: { name: string; date: Date } | null = null;

        // Find Next Prayer logic (iterates full list)
        outerLoop:
        for (const dayData of times) {
            for (const name of prayerNames) {
                const pDate = getPrayerDate(dayData, name);
                if (isAfter(pDate, now)) {
                    next = { name, date: pDate };
                    break outerLoop;
                }
            }
        }

        if (!next) {
            const todayFajr = getPrayerDate(todayData, "fajr");
            const tomorrowFajr = new Date(todayFajr);
            tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
            next = { name: "fajr", date: tomorrowFajr };
        }

        if (!next) return;

        const diff = next.date.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n: number) => n.toString().padStart(2, "0");
        const remaining = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        set({
            nextPrayer: {
                name: next.name,
                time: format(next.date, "HH:mm"),
                remaining
            }
        });

        const toMonoDigits = (str: string) => {
            return str.replace(/\d/g, (d) => {
                return String.fromCodePoint(0x1D7F6 + parseInt(d, 10));
            });
        };

        const prayerMap: Record<string, string> = {
            fajr: "Subuh",
            syuruk: "Syuruk",
            dhuhr: "Zohor",
            asr: "Asar",
            maghrib: "Maghrib",
            isha: "Isyak"
        };

        const displayName = prayerMap[next.name] || next.name;
        const trayString = ` ${displayName} -${pad(hours)}:${pad(minutes)}`;

        invoke("update_tray_title", {
            title: toMonoDigits(trayString)
        }).catch(err => console.error("Failed to update tray", err));
    }
}));
