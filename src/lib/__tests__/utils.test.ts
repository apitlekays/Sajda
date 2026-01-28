import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (className utility)', () => {
    it('should merge single class', () => {
        expect(cn('foo')).toBe('foo');
    });

    it('should merge multiple classes', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        expect(cn('foo', true && 'bar')).toBe('foo bar');
        expect(cn('foo', false && 'bar')).toBe('foo');
    });

    it('should handle undefined and null', () => {
        expect(cn('foo', undefined, 'bar')).toBe('foo bar');
        expect(cn('foo', null, 'bar')).toBe('foo bar');
    });

    it('should handle object syntax', () => {
        expect(cn({ foo: true, bar: false })).toBe('foo');
        expect(cn({ foo: true, bar: true })).toBe('foo bar');
    });

    it('should handle array syntax', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should merge Tailwind classes correctly (deduplication)', () => {
        // tailwind-merge handles conflicting classes
        expect(cn('px-2', 'px-4')).toBe('px-4');
        expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    });

    it('should handle complex combinations', () => {
        const isActive = true;
        const isDisabled = false;

        expect(cn(
            'base-class',
            isActive && 'active-class',
            isDisabled && 'disabled-class',
            { 'conditional-class': true }
        )).toBe('base-class active-class conditional-class');
    });

    it('should handle empty inputs', () => {
        expect(cn()).toBe('');
        expect(cn('')).toBe('');
    });

    it('should handle Tailwind color variants', () => {
        expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('should preserve non-conflicting classes', () => {
        expect(cn('p-4', 'm-2', 'text-center')).toBe('p-4 m-2 text-center');
    });
});
