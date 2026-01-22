import axios from "axios";
import { getCurrentPosition, checkPermissions, requestPermissions } from "@tauri-apps/plugin-geolocation";

const API_BASE = "https://api.waktusolat.app/v2/solat";

export interface PrayerTime {
    fajr: number;
    syuruk: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
    hijri?: string;
    date?: string;
    day?: number;
    imsak?: number;
}

export const LocationService = {
    async detectZone(): Promise<{ zone: string, lat: number, lng: number }> {
        let lat = 0;
        let lng = 0;

        try {
            console.log("Checking Location Permissions...");
            try {
                let permission = await checkPermissions();
                if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
                    await requestPermissions(['location']);
                }
            } catch (e) {
                console.warn("Permission check failed:", e);
            }

            console.log("Requesting Location Position via Tauri Plugin...");
            const position = await getCurrentPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });

            lat = position?.coords?.latitude || 0;
            lng = position?.coords?.longitude || 0;

            console.log(`Plugin Detected Coords: Lat ${lat}, Lng ${lng}`);

            // IP Fallback
            if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) {
                console.warn("Received (0,0) coordinates. Attempting IP Fallback...");
                try {
                    const ipRes = await axios.get('https://ipapi.co/json/');
                    if (ipRes.data && ipRes.data.latitude && ipRes.data.longitude) {
                        lat = ipRes.data.latitude;
                        lng = ipRes.data.longitude;
                        console.log(`Fallback using IP Coords: ${lat}, ${lng}`);
                    }
                } catch (ipError) {
                    console.error("IP Fallback failed:", ipError);
                }
            }

            // Call API for Zone
            const url = `${API_BASE}/gps/${lat}/${lng}`;
            console.log(`Calling API: ${url}`);

            const response = await axios.get(url);
            if (response.data && response.data.zone) {
                console.log("Detected Zone:", response.data.zone);
                return { zone: response.data.zone, lat, lng };
            } else {
                return { zone: "WLY01", lat, lng };
            }
        } catch (error) {
            console.error("Geolocation Error:", error);
            // Default Fallback
            return { zone: "WLY01", lat: 3.1390, lng: 101.6869 };
        }
    },

    async getCoordinates(): Promise<{ lat: number, lng: number } | null> {
        try {
            const position = await getCurrentPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
            return {
                lat: position?.coords?.latitude || 0,
                lng: position?.coords?.longitude || 0
            };
        } catch (e) {
            console.warn("Silent location check failed:", e);
            return null;
        }
    },

    async getPrayerTimes(zone: string): Promise<PrayerTime[]> {
        try {
            const response = await axios.get(`${API_BASE}/${zone}`);
            if (response.data && response.data.prayers) {
                return response.data.prayers;
            }
            throw new Error("Invalid API response");
        } catch (error) {
            console.error("Failed to fetch prayer times", error);
            throw error;
        }
    }
};
