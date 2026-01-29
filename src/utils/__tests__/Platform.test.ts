import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Platform, PlatformName } from '../Platform';

describe('Platform', () => {
    // Store original userAgent to restore after each test
    const originalUserAgent = navigator.userAgent;

    // Helper to mock userAgent
    const mockUserAgent = (ua: string) => {
        Object.defineProperty(navigator, 'userAgent', {
            value: ua,
            writable: true,
            configurable: true,
        });
    };

    afterEach(() => {
        // Restore original userAgent after each test
        Object.defineProperty(navigator, 'userAgent', {
            value: originalUserAgent,
            writable: true,
            configurable: true,
        });
    });

    describe('isMacOS', () => {
        it('should return true for macOS user agent', () => {
            mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            expect(Platform.isMacOS()).toBe(true);
        });

        it('should return true for macOS ARM user agent', () => {
            mockUserAgent('Mozilla/5.0 (Macintosh; Apple M1 Mac OS X 14_2) AppleWebKit/605.1.15');
            expect(Platform.isMacOS()).toBe(true);
        });

        it('should return false for iPhone user agent (contains Mac)', () => {
            mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
            expect(Platform.isMacOS()).toBe(false);
        });

        it('should return false for Windows user agent', () => {
            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            expect(Platform.isMacOS()).toBe(false);
        });

        it('should return false for Linux user agent', () => {
            mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
            expect(Platform.isMacOS()).toBe(false);
        });
    });

    describe('isWindows', () => {
        it('should return true for Windows 10 user agent', () => {
            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            expect(Platform.isWindows()).toBe(true);
        });

        it('should return true for Windows 11 user agent', () => {
            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0');
            expect(Platform.isWindows()).toBe(true);
        });

        it('should return false for macOS user agent', () => {
            mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            expect(Platform.isWindows()).toBe(false);
        });

        it('should return false for Linux user agent', () => {
            mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
            expect(Platform.isWindows()).toBe(false);
        });
    });

    describe('isLinux', () => {
        it('should return true for Linux user agent', () => {
            mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
            expect(Platform.isLinux()).toBe(true);
        });

        it('should return true for Ubuntu user agent', () => {
            mockUserAgent('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0');
            expect(Platform.isLinux()).toBe(true);
        });

        it('should return false for Android user agent (contains Linux)', () => {
            mockUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36');
            expect(Platform.isLinux()).toBe(false);
        });

        it('should return false for macOS user agent', () => {
            mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            expect(Platform.isLinux()).toBe(false);
        });

        it('should return false for Windows user agent', () => {
            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            expect(Platform.isLinux()).toBe(false);
        });
    });

    describe('getPlatformName', () => {
        it('should return "macos" for macOS user agent', () => {
            mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            expect(Platform.getPlatformName()).toBe('macos');
        });

        it('should return "windows" for Windows user agent', () => {
            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            expect(Platform.getPlatformName()).toBe('windows');
        });

        it('should return "linux" for Linux user agent', () => {
            mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
            expect(Platform.getPlatformName()).toBe('linux');
        });

        it('should return "unknown" for unrecognized user agent', () => {
            mockUserAgent('Mozilla/5.0 (Unknown; Platform) AppleWebKit/537.36');
            expect(Platform.getPlatformName()).toBe('unknown');
        });
    });

    describe('getPlatformDisplayName', () => {
        it('should return "macOS" for macOS user agent', () => {
            mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            expect(Platform.getPlatformDisplayName()).toBe('macOS');
        });

        it('should return "Windows" for Windows user agent', () => {
            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            expect(Platform.getPlatformDisplayName()).toBe('Windows');
        });

        it('should return "Linux" for Linux user agent', () => {
            mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
            expect(Platform.getPlatformDisplayName()).toBe('Linux');
        });

        it('should return "Unknown" for unrecognized user agent', () => {
            mockUserAgent('Mozilla/5.0 (Unknown; Platform) AppleWebKit/537.36');
            expect(Platform.getPlatformDisplayName()).toBe('Unknown');
        });
    });

    describe('supportsNativeLocation', () => {
        it('should return true for macOS', () => {
            mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            expect(Platform.supportsNativeLocation()).toBe(true);
        });

        it('should return true for Windows', () => {
            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            expect(Platform.supportsNativeLocation()).toBe(true);
        });

        it('should return false for Linux', () => {
            mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
            expect(Platform.supportsNativeLocation()).toBe(false);
        });

        it('should return false for unknown platform', () => {
            mockUserAgent('Mozilla/5.0 (Unknown; Platform) AppleWebKit/537.36');
            expect(Platform.supportsNativeLocation()).toBe(false);
        });
    });

    describe('getLocationPermissionGuidance', () => {
        it('should return Windows-specific guidance for Windows', () => {
            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            const guidance = Platform.getLocationPermissionGuidance();

            expect(guidance.title).toBe('Location Access Required');
            expect(guidance.message).toContain('Windows Settings');
            expect(guidance.settingsPath).toBe('Settings > Privacy & Security > Location');
        });

        it('should return macOS-specific guidance for macOS', () => {
            mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            const guidance = Platform.getLocationPermissionGuidance();

            expect(guidance.title).toBe('Location Access Required');
            expect(guidance.message).toContain('System Settings');
            expect(guidance.settingsPath).toContain('Sajda');
        });

        it('should return generic guidance for other platforms', () => {
            mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
            const guidance = Platform.getLocationPermissionGuidance();

            expect(guidance.title).toBe('Location Access');
            expect(guidance.settingsPath).toBeUndefined();
        });
    });

    describe('getAutostartGuidance', () => {
        it('should return Windows-specific guidance for Windows', () => {
            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            const guidance = Platform.getAutostartGuidance();

            expect(guidance).toContain('Task Manager');
            expect(guidance).toContain('Startup');
        });

        it('should return macOS-specific guidance for macOS', () => {
            mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            const guidance = Platform.getAutostartGuidance();

            expect(guidance).toContain('System Settings');
            expect(guidance).toContain('Login Items');
        });

        it('should return generic guidance for other platforms', () => {
            mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
            const guidance = Platform.getAutostartGuidance();

            expect(guidance).toContain('vary by system');
        });
    });

    describe('type safety', () => {
        it('should return valid PlatformName type', () => {
            const validNames: PlatformName[] = ['macos', 'windows', 'linux', 'unknown'];

            mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
            expect(validNames).toContain(Platform.getPlatformName());

            mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            expect(validNames).toContain(Platform.getPlatformName());

            mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
            expect(validNames).toContain(Platform.getPlatformName());

            mockUserAgent('Unknown');
            expect(validNames).toContain(Platform.getPlatformName());
        });
    });
});
