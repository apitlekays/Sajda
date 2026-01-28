import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { LocationService } from '../LocationService';

const mockedInvoke = vi.mocked(invoke);

describe('LocationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isNativeLocationAvailable', () => {
        it('should return true when native location is available', async () => {
            mockedInvoke.mockResolvedValueOnce(true);

            const result = await LocationService.isNativeLocationAvailable();

            expect(result).toBe(true);
            expect(mockedInvoke).toHaveBeenCalledWith('is_native_location_available');
        });

        it('should return false when invoke fails', async () => {
            mockedInvoke.mockRejectedValueOnce(new Error('Not available'));

            const result = await LocationService.isNativeLocationAvailable();

            expect(result).toBe(false);
        });
    });

    describe('getMacOSVersion', () => {
        it('should return macOS version string', async () => {
            mockedInvoke.mockResolvedValueOnce('14.2');

            const result = await LocationService.getMacOSVersion();

            expect(result).toBe('14.2');
            expect(mockedInvoke).toHaveBeenCalledWith('get_macos_version_cmd');
        });

        it('should return "0.0" when invoke fails', async () => {
            mockedInvoke.mockRejectedValueOnce(new Error('Failed'));

            const result = await LocationService.getMacOSVersion();

            expect(result).toBe('0.0');
        });
    });

    describe('checkNativeLocationAuth', () => {
        it('should return authorization status', async () => {
            mockedInvoke.mockResolvedValueOnce(0); // authorized

            const result = await LocationService.checkNativeLocationAuth();

            expect(result).toBe(0);
            expect(mockedInvoke).toHaveBeenCalledWith('check_native_location_auth');
        });

        it('should return 4 (not supported) when invoke fails', async () => {
            mockedInvoke.mockRejectedValueOnce(new Error('Failed'));

            const result = await LocationService.checkNativeLocationAuth();

            expect(result).toBe(4);
        });
    });

    describe('requestNativeLocationAuth', () => {
        it('should call invoke to request authorization', async () => {
            mockedInvoke.mockResolvedValueOnce(undefined);

            await LocationService.requestNativeLocationAuth();

            expect(mockedInvoke).toHaveBeenCalledWith('request_native_location_auth');
        });

        it('should handle errors gracefully', async () => {
            mockedInvoke.mockRejectedValueOnce(new Error('Failed'));

            // Should not throw
            await expect(LocationService.requestNativeLocationAuth()).resolves.toBeUndefined();
        });
    });

    describe('getNativeLocation', () => {
        it('should return location when successful', async () => {
            mockedInvoke.mockResolvedValueOnce({
                latitude: 3.139,
                longitude: 101.687,
                accuracy: 10,
                error_code: 0,
                error_message: '',
                source: 'native'
            });

            const result = await LocationService.getNativeLocation();

            expect(result.lat).toBe(3.139);
            expect(result.lng).toBe(101.687);
            expect(result.source).toBe('native');
        });

        it('should return unavailable when error_code is non-zero', async () => {
            mockedInvoke.mockResolvedValueOnce({
                latitude: 0,
                longitude: 0,
                accuracy: 0,
                error_code: 1,
                error_message: 'Denied',
                source: ''
            });

            const result = await LocationService.getNativeLocation();

            expect(result.source).toBe('unavailable');
        });

        it('should return unavailable when invoke fails', async () => {
            mockedInvoke.mockRejectedValueOnce(new Error('Failed'));

            const result = await LocationService.getNativeLocation();

            expect(result.source).toBe('unavailable');
        });
    });

    describe('getIPLocation', () => {
        it('should return location from IP geolocation', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    latitude: 3.14,
                    longitude: 101.69
                }
            });

            const result = await LocationService.getIPLocation();

            expect(result.lat).toBe(3.14);
            expect(result.lng).toBe(101.69);
            expect(result.source).toBe('ip');
        });

        it('should retry on failure', async () => {
            mockedAxios.get
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    data: {
                        latitude: 3.14,
                        longitude: 101.69
                    }
                });

            const result = await LocationService.getIPLocation();

            expect(result.source).toBe('ip');
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
        });

        it('should return unavailable after all retries fail', async () => {
            mockedAxios.get.mockRejectedValue(new Error('Network error'));

            const result = await LocationService.getIPLocation();

            expect(result.source).toBe('unavailable');
            expect(mockedAxios.get).toHaveBeenCalledTimes(3); // MAX_RETRIES = 3
        });

        it('should return unavailable when response has no coordinates', async () => {
            mockedAxios.get.mockResolvedValue({
                data: {}
            });

            const result = await LocationService.getIPLocation();

            expect(result.source).toBe('unavailable');
        });
    });

    describe('getPrayerTimes', () => {
        it('should fetch prayer times for a zone', async () => {
            const mockPrayers = [
                { fajr: 1234567890, dhuhr: 1234567890 }
            ];
            mockedAxios.get.mockResolvedValueOnce({
                data: { prayers: mockPrayers }
            });

            const result = await LocationService.getPrayerTimes('WLY01');

            expect(result).toEqual(mockPrayers);
            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.stringContaining('WLY01'),
                expect.any(Object)
            );
        });

        it('should throw error on invalid response', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: {}
            });

            await expect(LocationService.getPrayerTimes('WLY01')).rejects.toThrow('Invalid API response');
        });

        it('should throw error on network failure', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

            await expect(LocationService.getPrayerTimes('WLY01')).rejects.toThrow();
        });
    });
});
