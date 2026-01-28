import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getIslamicKeyDateMessages, KeyDateMessage } from '../HijriDate';

describe('HijriDate', () => {
    describe('getIslamicKeyDateMessages', () => {
        it('should return an array', () => {
            const messages = getIslamicKeyDateMessages();
            expect(Array.isArray(messages)).toBe(true);
        });

        it('should return messages with correct structure', () => {
            const messages = getIslamicKeyDateMessages();
            messages.forEach(msg => {
                expect(msg).toHaveProperty('text');
                expect(msg).toHaveProperty('type');
                expect(['highlight', 'countdown']).toContain(msg.type);
            });
        });

        it('should return KeyDateMessage objects', () => {
            const messages = getIslamicKeyDateMessages();
            messages.forEach((msg: KeyDateMessage) => {
                expect(typeof msg.text).toBe('string');
                expect(msg.text.length).toBeGreaterThan(0);
            });
        });

        it('should not throw errors', () => {
            expect(() => getIslamicKeyDateMessages()).not.toThrow();
        });
    });

    describe('KeyDateMessage types', () => {
        it('highlight type should be for on-date events', () => {
            const messages = getIslamicKeyDateMessages();
            const highlights = messages.filter(m => m.type === 'highlight');

            highlights.forEach(msg => {
                // Highlight messages should not contain "days to"
                expect(msg.text).not.toMatch(/\d+ days to/);
            });
        });

        it('countdown type should contain days remaining', () => {
            const messages = getIslamicKeyDateMessages();
            const countdowns = messages.filter(m => m.type === 'countdown');

            countdowns.forEach(msg => {
                // Countdown messages should contain "days to"
                expect(msg.text).toMatch(/\d+ days to/);
            });
        });
    });

    describe('Date-based mocking', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should work with mocked dates', () => {
            // Set to a known date
            vi.setSystemTime(new Date('2024-03-15'));

            const messages = getIslamicKeyDateMessages();
            expect(Array.isArray(messages)).toBe(true);
        });

        it('should handle year transitions', () => {
            // Set to December 31
            vi.setSystemTime(new Date('2024-12-31'));

            const messages = getIslamicKeyDateMessages();
            expect(Array.isArray(messages)).toBe(true);
        });

        it('should handle leap years', () => {
            // Leap year date
            vi.setSystemTime(new Date('2024-02-29'));

            const messages = getIslamicKeyDateMessages();
            expect(Array.isArray(messages)).toBe(true);
        });
    });
});
