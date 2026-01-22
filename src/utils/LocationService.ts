import axios from "axios";
import { getCurrentPosition, checkPermissions, requestPermissions } from "@tauri-apps/plugin-geolocation";

const API_BASE = "https://api.waktusolat.app/v2/solat";

export interface PrayerTime {
    hijri: string;
    date: string;
    day: number;
    imsak: number;
    fajr: number;
    syuruk: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
}

export const LocationService = {
    async detectZone(): Promise<string> {
        try {
            console.log("Checking Location Permissions...");

            // Explicitly check permissions first
            try {
                let permission = await checkPermissions();
                console.log("Initial Permission State:", permission);

                if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
                    console.log("Requesting Permissions...");
                    permission = await requestPermissions(['location']); // Tauri v2 expects string[]
                    console.log("New Permission State:", permission);
                }

                if (permission.location === 'denied') {
                    console.error("Location permission denied by user (explicit check).");
                    // Do not return immediately, sometimes getCurrentPosition triggers the prompt anyway or works if partially allowed?
                    // Actually if denied, getCurrentPosition will likely fail or return garbage.
                    // Let's try to proceed carefully or basic fallback.
                }
            } catch (e) {
                console.warn("Permission check/request failed (might be not supported on platform):", e);
            }

            console.log("Requesting Location Position via Tauri Plugin...");

            // Try High Accuracy to force CoreLocation usage
            const position = await getCurrentPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });

            console.log("Raw Position Object:", JSON.stringify(position, null, 2));

            let lat = position?.coords?.latitude || 0;
            let lng = position?.coords?.longitude || 0;

            console.log(`Plugin Detected Coords: Lat ${lat}, Lng ${lng}`);

            // Handle invalid/mock coordinates
            if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) {
                console.warn("Received (0,0) coordinates. Attempting IP Fallback...");
                try {
                    const ipRes = await axios.get('https://ipapi.co/json/');
                    console.log("IP Geolocation Success:", ipRes.data);
                    if (ipRes.data && ipRes.data.latitude && ipRes.data.longitude) {
                        lat = ipRes.data.latitude;
                        lng = ipRes.data.longitude;
                        console.log(`Fallback using IP Coords: ${lat}, ${lng}`);
                    } else {
                        return "WLY01";
                    }
                } catch (ipError) {
                    console.error("IP Fallback failed:", ipError);
                    return "WLY01";
                }
            }

            // Call WaktuSolat GPS Endpoint
            const url = `${API_BASE}/gps/${lat}/${lng}`;
            console.log(`Calling API: ${url}`);

            const response = await axios.get(url);
            console.log("API Response Status:", response.status);
            console.log("API Response Data:", JSON.stringify(response.data));

            if (response.data && response.data.zone) {
                console.log("Detected Zone:", response.data.zone);
                return response.data.zone;
            } else {
                console.warn("API did not return a zone, using WLY01. Response was:", response.data);
                return "WLY01";
            }
        } catch (error) {
            console.error("Geolocation Error Detailed:", error);

            // Allow IP fallback even on plugin error (e.g. permission denied)
            try {
                console.warn("Attempting IP Fallback after Plugin Error...");
                const ipRes = await axios.get('https://ipapi.co/json/');
                if (ipRes.data && ipRes.data.latitude && ipRes.data.longitude) {
                    const lat = ipRes.data.latitude;
                    const lng = ipRes.data.longitude;
                    console.log(`Fallback using IP Coords: ${lat}, ${lng}`);

                    // Call WaktuSolat GPS Endpoint with IP coords
                    const url = `${API_BASE}/gps/${lat}/${lng}`;
                    const response = await axios.get(url);
                    if (response.data && response.data.zone) {
                        console.log("Detected Zone (IP):", response.data.zone);
                        return response.data.zone;
                    }
                }
            } catch (fbError) {
                console.error("Secondary IP Fallback failed:", fbError);
            }

            return "WLY01"; // Ultimate Fallback
        }
    },

    async getPrayerTimes(zone: string): Promise<PrayerTime[]> {
        try {
            const response = await axios.get(`${API_BASE}/${zone}`);
            // API returns { prayers: [...] }
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
