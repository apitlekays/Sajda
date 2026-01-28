import { describe, it, expect } from 'vitest';
import { ZONE_MAPPING } from '../ZoneData';

describe('ZoneData', () => {
    describe('ZONE_MAPPING', () => {
        it('should be an object', () => {
            expect(typeof ZONE_MAPPING).toBe('object');
        });

        it('should have multiple zones', () => {
            const zoneCount = Object.keys(ZONE_MAPPING).length;
            expect(zoneCount).toBeGreaterThan(50); // Malaysia has 60+ zones
        });

        it('should contain major Malaysian states', () => {
            // Check Johor zones
            expect(ZONE_MAPPING['JHR01']).toBeDefined();
            expect(ZONE_MAPPING['JHR02']).toBeDefined();

            // Check Selangor zones
            expect(ZONE_MAPPING['SGR01']).toBeDefined();
            expect(ZONE_MAPPING['SGR02']).toBeDefined();

            // Check Kuala Lumpur
            expect(ZONE_MAPPING['WLY01']).toContain('Kuala Lumpur');

            // Check Labuan
            expect(ZONE_MAPPING['WLY02']).toContain('Labuan');
        });

        it('should have correct format for zone codes', () => {
            Object.keys(ZONE_MAPPING).forEach(code => {
                // Zone codes should be 5 characters: 3 letters + 2 digits
                expect(code).toMatch(/^[A-Z]{3}[0-9]{2}$/);
            });
        });

        it('should have non-empty descriptions', () => {
            Object.values(ZONE_MAPPING).forEach(description => {
                expect(typeof description).toBe('string');
                expect(description.length).toBeGreaterThan(0);
            });
        });

        it('should contain East Malaysia zones', () => {
            // Sabah
            expect(ZONE_MAPPING['SBH01']).toBeDefined();
            expect(ZONE_MAPPING['SBH01']).toContain('Sandakan');

            // Sarawak
            expect(ZONE_MAPPING['SWK01']).toBeDefined();
            expect(ZONE_MAPPING['SWK08']).toContain('Kuching');
        });

        it('should contain major cities in descriptions', () => {
            expect(ZONE_MAPPING['JHR02']).toContain('Johor Bahru');
            expect(ZONE_MAPPING['PNG01']).toContain('PULAU PINANG');
            expect(ZONE_MAPPING['PRK02']).toContain('Ipoh');
            expect(ZONE_MAPPING['SGR01']).toContain('Shah Alam');
        });

        it('should have Perlis as single zone state', () => {
            expect(ZONE_MAPPING['PLS01']).toBe('SELURUH NEGERI PERLIS');
        });

        it('should have Melaka as single zone state', () => {
            expect(ZONE_MAPPING['MLK01']).toBe('SELURUH NEGERI MELAKA');
        });
    });

    describe('Zone code prefixes', () => {
        const statePrefixes = [
            'JHR', // Johor
            'KDH', // Kedah
            'KTN', // Kelantan
            'MLK', // Melaka
            'NGS', // Negeri Sembilan
            'PHG', // Pahang
            'PRK', // Perak
            'PLS', // Perlis
            'PNG', // Pulau Pinang
            'SBH', // Sabah
            'SWK', // Sarawak
            'SGR', // Selangor
            'TRG', // Terengganu
            'WLY', // Wilayah Persekutuan
        ];

        it('should have zones for all major states', () => {
            statePrefixes.forEach(prefix => {
                const hasZone = Object.keys(ZONE_MAPPING).some(code =>
                    code.startsWith(prefix)
                );
                expect(hasZone).toBe(true);
            });
        });
    });
});
