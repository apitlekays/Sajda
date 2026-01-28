import { describe, it, expect, beforeEach, vi } from 'vitest';
import { format } from 'date-fns';

// Mock the Tauri plugin-store
vi.mock('@tauri-apps/plugin-store', () => ({
    load: vi.fn(() => Promise.resolve({
        get: vi.fn(() => Promise.resolve(null)),
        set: vi.fn(() => Promise.resolve()),
        save: vi.fn(() => Promise.resolve())
    }))
}));

// Mock analytics
vi.mock('../../utils/Analytics', () => ({
    trackError: vi.fn()
}));

import { useTrackerStore } from '../TrackerStore';

describe('TrackerStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useTrackerStore.setState({
            records: {},
            isLoading: true
        });
        vi.clearAllMocks();
    });

    describe('Initial state', () => {
        it('should have empty records initially', () => {
            const state = useTrackerStore.getState();
            expect(state.records).toEqual({});
        });

        it('should have isLoading as true initially', () => {
            const state = useTrackerStore.getState();
            expect(state.isLoading).toBe(true);
        });
    });

    describe('isChecked', () => {
        it('should return false for unchecked prayer', () => {
            const today = format(new Date(), 'yyyy-MM-dd');

            const result = useTrackerStore.getState().isChecked('fajr', today);

            expect(result).toBe(false);
        });

        it('should return true for checked prayer', () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            useTrackerStore.setState({
                records: {
                    [today]: { fajr: true }
                }
            });

            const result = useTrackerStore.getState().isChecked('fajr', today);

            expect(result).toBe(true);
        });

        it('should use current date when dateStr is not provided', () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            useTrackerStore.setState({
                records: {
                    [today]: { dhuhr: true }
                }
            });

            const result = useTrackerStore.getState().isChecked('dhuhr');

            expect(result).toBe(true);
        });

        it('should return false for non-existent date', () => {
            const result = useTrackerStore.getState().isChecked('fajr', '2020-01-01');

            expect(result).toBe(false);
        });

        it('should return false for non-existent prayer on existing date', () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            useTrackerStore.setState({
                records: {
                    [today]: { fajr: true }
                }
            });

            const result = useTrackerStore.getState().isChecked('isha', today);

            expect(result).toBe(false);
        });
    });

    describe('togglePrayer', () => {
        it('should toggle prayer from unchecked to checked', async () => {
            const today = format(new Date(), 'yyyy-MM-dd');

            await useTrackerStore.getState().togglePrayer('fajr', today);

            const state = useTrackerStore.getState();
            expect(state.records[today]?.fajr).toBe(true);
        });

        it('should toggle prayer from checked to unchecked', async () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            useTrackerStore.setState({
                records: {
                    [today]: { fajr: true }
                }
            });

            await useTrackerStore.getState().togglePrayer('fajr', today);

            const state = useTrackerStore.getState();
            expect(state.records[today]?.fajr).toBe(false);
        });

        it('should use current date when dateStr is not provided', async () => {
            const today = format(new Date(), 'yyyy-MM-dd');

            await useTrackerStore.getState().togglePrayer('asr');

            const state = useTrackerStore.getState();
            expect(state.records[today]?.asr).toBe(true);
        });

        it('should preserve other prayers when toggling', async () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            useTrackerStore.setState({
                records: {
                    [today]: { fajr: true, dhuhr: true }
                }
            });

            await useTrackerStore.getState().togglePrayer('asr', today);

            const state = useTrackerStore.getState();
            expect(state.records[today]?.fajr).toBe(true);
            expect(state.records[today]?.dhuhr).toBe(true);
            expect(state.records[today]?.asr).toBe(true);
        });

        it('should preserve other dates when toggling', async () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            const yesterday = '2024-01-01';
            useTrackerStore.setState({
                records: {
                    [yesterday]: { fajr: true }
                }
            });

            await useTrackerStore.getState().togglePrayer('fajr', today);

            const state = useTrackerStore.getState();
            expect(state.records[yesterday]?.fajr).toBe(true);
            expect(state.records[today]?.fajr).toBe(true);
        });
    });

    describe('loadRecords', () => {
        it('should set isLoading to false after load', async () => {
            await useTrackerStore.getState().loadRecords();

            const state = useTrackerStore.getState();
            expect(state.isLoading).toBe(false);
        });
    });

    describe('Date format', () => {
        it('should use yyyy-MM-dd format', () => {
            const today = format(new Date(), 'yyyy-MM-dd');

            // Verify format
            expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('should handle date correctly', async () => {
            const specificDate = '2024-06-15';

            await useTrackerStore.getState().togglePrayer('maghrib', specificDate);

            const state = useTrackerStore.getState();
            expect(state.records[specificDate]?.maghrib).toBe(true);
        });
    });

    describe('Multiple prayers', () => {
        it('should track all 6 prayers independently', async () => {
            const today = format(new Date(), 'yyyy-MM-dd');
            const prayers = ['fajr', 'syuruk', 'dhuhr', 'asr', 'maghrib', 'isha'];

            for (const prayer of prayers) {
                await useTrackerStore.getState().togglePrayer(prayer, today);
            }

            const state = useTrackerStore.getState();
            prayers.forEach(prayer => {
                expect(state.records[today]?.[prayer]).toBe(true);
            });
        });
    });
});
