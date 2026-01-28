import axios from "axios";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../store/SettingsStore";

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

interface NativeLocationResult {
    latitude: number;
    longitude: number;
    accuracy: number;
    error_code: number;
    error_message: string;
    source: string;
}

export const LocationService = {
    /**
     * Check if native macOS Core Location is available
     * Returns true on macOS 10.15+
     */
    async isNativeLocationAvailable(): Promise<boolean> {
        try {
            return await invoke<boolean>("is_native_location_available");
        } catch (e) {
            console.warn("Native location check failed:", e);
            return false;
        }
    },

    /**
     * Get macOS version string (e.g., "14.2")
     */
    async getMacOSVersion(): Promise<string> {
        try {
            return await invoke<string>("get_macos_version_cmd");
        } catch (e) {
            return "0.0";
        }
    },

    /**
     * Check native location authorization status
     * Returns: 0 = authorized, 1 = denied, 2 = not determined, 3 = restricted, 4 = not supported
     */
    async checkNativeLocationAuth(): Promise<number> {
        try {
            return await invoke<number>("check_native_location_auth");
        } catch (e) {
            return 4;
        }
    },

    /**
     * Request native location authorization (shows system dialog on macOS)
     */
    async requestNativeLocationAuth(): Promise<void> {
        try {
            await invoke("request_native_location_auth");
        } catch (e) {
            console.warn("Native location auth request failed:", e);
        }
    },

    /**
     * Get location using native macOS Core Location
     * Falls back to IP-based location if native fails or is unavailable
     */
    async getNativeLocation(): Promise<{ lat: number; lng: number; source: string }> {
        try {
            const result = await invoke<NativeLocationResult>("get_native_location");

            if (result.error_code === 0 && result.latitude !== 0 && result.longitude !== 0) {
                console.log(`Native location: ${result.latitude}, ${result.longitude} (accuracy: ${result.accuracy}m)`);
                return {
                    lat: result.latitude,
                    lng: result.longitude,
                    source: "native"
                };
            }

            console.log(`Native location failed: ${result.error_message} (code: ${result.error_code})`);
            return { lat: 0, lng: 0, source: "unavailable" };
        } catch (e) {
            console.warn("Native location invoke failed:", e);
            return { lat: 0, lng: 0, source: "unavailable" };
        }
    },

    /**
     * Get location via IP-based geolocation (fallback)
     * Includes retry logic with exponential backoff
     */
    async getIPLocation(): Promise<{ lat: number; lng: number; source: string }> {
        const MAX_RETRIES = 3;
        const INITIAL_DELAY_MS = 1000;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[LocationService] IP geolocation attempt ${attempt}/${MAX_RETRIES}...`);
                const response = await axios.get('https://ipapi.co/json/', { timeout: 5000 });
                if (response.data?.latitude && response.data?.longitude) {
                    console.log(`IP location: ${response.data.latitude}, ${response.data.longitude}`);
                    return {
                        lat: response.data.latitude,
                        lng: response.data.longitude,
                        source: "ip"
                    };
                }
                console.warn(`[LocationService] IP response missing coordinates (attempt ${attempt})`);
            } catch (e) {
                console.error(`[LocationService] IP geolocation failed (attempt ${attempt}):`, e);

                if (attempt < MAX_RETRIES) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                    console.log(`[LocationService] Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        console.error("[LocationService] IP geolocation failed after all retries");
        return { lat: 0, lng: 0, source: "unavailable" };
    },

    /**
     * Detect prayer zone using best available location method
     * Priority: Native GPS (macOS 10.15+) -> IP Geolocation -> Default (WLY01)
     */
    async detectZone(): Promise<{ zone: string, lat: number, lng: number, source: string }> {
        let lat = 0;
        let lng = 0;
        let source = "default";

        try {
            const { locationEnabled } = useSettingsStore.getState();
            console.log(`[LocationService] detectZone called, locationEnabled: ${locationEnabled}`);

            // Always check if native location is available first
            const nativeAvailable = await this.isNativeLocationAvailable();
            console.log(`[LocationService] Native location available: ${nativeAvailable}`);

            if (nativeAvailable) {
                // Check authorization status
                const authStatus = await this.checkNativeLocationAuth();
                console.log(`[LocationService] Native auth status: ${authStatus} (0=authorized, 1=denied, 2=notDetermined, 3=restricted, 4=disabled)`);

                // If authorized (0) or not determined (2), try native location
                // The Swift code handles authorization request internally when status is notDetermined
                if (authStatus === 0 || authStatus === 2) {
                    console.log(`[LocationService] Auth status is ${authStatus}, attempting native location...`);
                    console.log(`[LocationService] (Swift will handle authorization request if needed)`);

                    const nativeResult = await this.getNativeLocation();
                    console.log(`[LocationService] Native result: lat=${nativeResult.lat}, lng=${nativeResult.lng}, source=${nativeResult.source}`);

                    if (nativeResult.source === "native") {
                        lat = nativeResult.lat;
                        lng = nativeResult.lng;
                        source = "native";
                        console.log(`[LocationService] SUCCESS: Using NATIVE location: ${lat}, ${lng}`);
                    } else {
                        console.log(`[LocationService] Native location failed (source=${nativeResult.source}), will try IP fallback`);
                    }
                } else if (authStatus === 1 || authStatus === 3) {
                    console.log("[LocationService] Native location DENIED or RESTRICTED - will use IP fallback");
                } else {
                    console.log(`[LocationService] Unknown auth status: ${authStatus} - will use IP fallback`);
                }
            }

            // Fallback to IP if native failed or unavailable
            if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) {
                console.log("[LocationService] Native location failed/unavailable, falling back to IP...");
                const ipResult = await this.getIPLocation();
                console.log(`[LocationService] IP result: lat=${ipResult.lat}, lng=${ipResult.lng}, source=${ipResult.source}`);
                if (ipResult.source === "ip") {
                    lat = ipResult.lat;
                    lng = ipResult.lng;
                    source = "ip";
                    console.log(`[LocationService] Using IP location: ${lat}, ${lng}`);
                }
            }

            // Call API for Zone if we have coordinates
            if (Math.abs(lat) > 0.01 || Math.abs(lng) > 0.01) {
                const url = `${API_BASE}/gps/${lat}/${lng}`;
                console.log(`Calling zone API: ${url}`);

                const response = await axios.get(url, { timeout: 10000 });
                if (response.data?.zone) {
                    console.log(`Detected zone: ${response.data.zone} (source: ${source})`);
                    return { zone: response.data.zone, lat, lng, source };
                }
            }

            // Default fallback
            console.log("Using default zone: WLY01");
            return { zone: "WLY01", lat: 3.1390, lng: 101.6869, source: "default" };
        } catch (error) {
            console.error("Zone detection error:", error);
            return { zone: "WLY01", lat: 3.1390, lng: 101.6869, source: "default" };
        }
    },

    /**
     * Get coordinates using best available method
     */
    async getCoordinates(): Promise<{ lat: number, lng: number, source: string } | null> {
        const { locationEnabled } = useSettingsStore.getState();

        if (!locationEnabled) {
            console.log("Location services disabled by user");
            return null;
        }

        // Try native first
        const nativeAvailable = await this.isNativeLocationAvailable();
        if (nativeAvailable) {
            const authStatus = await this.checkNativeLocationAuth();
            if (authStatus === 0) {
                const result = await this.getNativeLocation();
                if (result.source === "native") {
                    return result;
                }
            }
        }

        // Fallback to IP
        return await this.getIPLocation();
    },

    async getPrayerTimes(zone: string): Promise<PrayerTime[]> {
        try {
            const response = await axios.get(`${API_BASE}/${zone}`, { timeout: 10000 });
            if (response.data?.prayers) {
                return response.data.prayers;
            }
            throw new Error("Invalid API response");
        } catch (error) {
            console.error("Failed to fetch prayer times", error);
            throw error;
        }
    }
};
