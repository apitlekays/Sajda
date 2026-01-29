/**
 * Platform detection utilities for cross-platform support
 *
 * Provides runtime detection of the current operating system
 * for platform-specific UI and behavior adjustments.
 */

export type PlatformName = 'macos' | 'windows' | 'linux' | 'unknown';

/**
 * Platform detection utilities
 */
export const Platform = {
    /**
     * Check if running on macOS
     */
    isMacOS(): boolean {
        return navigator.userAgent.includes('Mac') && !navigator.userAgent.includes('iPhone');
    },

    /**
     * Check if running on Windows
     */
    isWindows(): boolean {
        return navigator.userAgent.includes('Windows');
    },

    /**
     * Check if running on Linux
     */
    isLinux(): boolean {
        return navigator.userAgent.includes('Linux') && !navigator.userAgent.includes('Android');
    },

    /**
     * Get the current platform name
     */
    getPlatformName(): PlatformName {
        if (this.isMacOS()) return 'macos';
        if (this.isWindows()) return 'windows';
        if (this.isLinux()) return 'linux';
        return 'unknown';
    },

    /**
     * Get a user-friendly platform display name
     */
    getPlatformDisplayName(): string {
        const platform = this.getPlatformName();
        switch (platform) {
            case 'macos': return 'macOS';
            case 'windows': return 'Windows';
            case 'linux': return 'Linux';
            default: return 'Unknown';
        }
    },

    /**
     * Check if native location services are potentially available
     * This is a frontend hint; actual availability is determined by Rust backend
     */
    supportsNativeLocation(): boolean {
        return this.isMacOS() || this.isWindows();
    },

    /**
     * Get platform-specific location permission guidance
     */
    getLocationPermissionGuidance(): {
        title: string;
        message: string;
        settingsPath?: string;
    } {
        if (this.isWindows()) {
            return {
                title: "Location Access Required",
                message: "To get accurate prayer times based on your location, please enable location access in Windows Settings.",
                settingsPath: "Settings > Privacy & Security > Location"
            };
        }

        if (this.isMacOS()) {
            return {
                title: "Location Access Required",
                message: "Please allow location access in System Settings to get accurate prayer times for your area.",
                settingsPath: "System Settings > Privacy & Security > Location Services > Sajda"
            };
        }

        return {
            title: "Location Access",
            message: "Location services help determine accurate prayer times for your area."
        };
    },

    /**
     * Get platform-specific autostart guidance
     */
    getAutostartGuidance(): string {
        if (this.isWindows()) {
            return "Autostart can be managed in Task Manager > Startup apps";
        }
        if (this.isMacOS()) {
            return "Autostart can be managed in System Settings > General > Login Items";
        }
        return "Autostart settings vary by system";
    }
};

export default Platform;
