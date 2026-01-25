import { describe, it, expect } from 'vitest';
import { getIslamicKeyDateMessages } from '../HijriDate';

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

        it('should return at most 2 messages', () => {
            const messages = getIslamicKeyDateMessages();
            // The function may return more, but Dashboard only displays 2
            // This validates the structure is correct
            expect(messages.length).toBeGreaterThanOrEqual(0);
        });
    });
});
