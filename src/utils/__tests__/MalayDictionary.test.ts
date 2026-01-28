import { describe, it, expect } from 'vitest';
import {
    PRAYER_NAMES,
    getPrayerDisplayName,
    HIJRI_MONTHS,
    getHijriMonthName,
    formatHijriDate,
    ISLAMIC_DATES,
    UI_LABELS,
    NOTIFICATIONS,
    PrayerKey
} from '../MalayDictionary';

describe('MalayDictionary', () => {
    describe('PRAYER_NAMES', () => {
        it('should have all 6 prayer times', () => {
            const keys: PrayerKey[] = ['fajr', 'syuruk', 'dhuhr', 'asr', 'maghrib', 'isha'];
            keys.forEach(key => {
                expect(PRAYER_NAMES[key]).toBeDefined();
            });
        });

        it('should have correct Malay translations', () => {
            expect(PRAYER_NAMES.fajr).toBe('Subuh');
            expect(PRAYER_NAMES.syuruk).toBe('Syuruk');
            expect(PRAYER_NAMES.dhuhr).toBe('Zohor');
            expect(PRAYER_NAMES.asr).toBe('Asar');
            expect(PRAYER_NAMES.maghrib).toBe('Maghrib');
            expect(PRAYER_NAMES.isha).toBe('Isyak');
        });
    });

    describe('getPrayerDisplayName', () => {
        it('should return correct name for non-Friday', () => {
            expect(getPrayerDisplayName('fajr', false)).toBe('Subuh');
            expect(getPrayerDisplayName('dhuhr', false)).toBe('Zohor');
            expect(getPrayerDisplayName('asr', false)).toBe('Asar');
            expect(getPrayerDisplayName('maghrib', false)).toBe('Maghrib');
            expect(getPrayerDisplayName('isha', false)).toBe('Isyak');
        });

        it('should return Jumaat for dhuhr on Friday', () => {
            expect(getPrayerDisplayName('dhuhr', true)).toBe('Jumaat');
        });

        it('should return normal names for other prayers on Friday', () => {
            expect(getPrayerDisplayName('fajr', true)).toBe('Subuh');
            expect(getPrayerDisplayName('asr', true)).toBe('Asar');
            expect(getPrayerDisplayName('maghrib', true)).toBe('Maghrib');
            expect(getPrayerDisplayName('isha', true)).toBe('Isyak');
        });

        it('should default isFriday to false', () => {
            expect(getPrayerDisplayName('dhuhr')).toBe('Zohor');
        });
    });

    describe('HIJRI_MONTHS', () => {
        it('should have all 12 months', () => {
            expect(HIJRI_MONTHS).toHaveLength(12);
        });

        it('should have correct month names in order', () => {
            expect(HIJRI_MONTHS[0]).toBe('Muharram');
            expect(HIJRI_MONTHS[1]).toBe('Safar');
            expect(HIJRI_MONTHS[2]).toBe('Rabiulawal');
            expect(HIJRI_MONTHS[3]).toBe('Rabiulakhir');
            expect(HIJRI_MONTHS[4]).toBe('Jamadilawal');
            expect(HIJRI_MONTHS[5]).toBe('Jamadilakhir');
            expect(HIJRI_MONTHS[6]).toBe('Rejab');
            expect(HIJRI_MONTHS[7]).toBe('Syaaban');
            expect(HIJRI_MONTHS[8]).toBe('Ramadhan');
            expect(HIJRI_MONTHS[9]).toBe('Syawal');
            expect(HIJRI_MONTHS[10]).toBe('Zulkaedah');
            expect(HIJRI_MONTHS[11]).toBe('Zulhijjah');
        });
    });

    describe('getHijriMonthName', () => {
        it('should return correct month name for valid months', () => {
            expect(getHijriMonthName(1)).toBe('Muharram');
            expect(getHijriMonthName(9)).toBe('Ramadhan');
            expect(getHijriMonthName(12)).toBe('Zulhijjah');
        });

        it('should return empty string for invalid months', () => {
            expect(getHijriMonthName(0)).toBe('');
            expect(getHijriMonthName(13)).toBe('');
            expect(getHijriMonthName(-1)).toBe('');
        });
    });

    describe('formatHijriDate', () => {
        it('should format date correctly', () => {
            expect(formatHijriDate(1446, 9, 1)).toBe('1 Ramadhan 1446');
            expect(formatHijriDate(1446, 1, 10)).toBe('10 Muharram 1446');
            expect(formatHijriDate(1446, 12, 10)).toBe('10 Zulhijjah 1446');
        });

        it('should handle single digit days', () => {
            expect(formatHijriDate(1446, 10, 1)).toBe('1 Syawal 1446');
        });
    });

    describe('ISLAMIC_DATES', () => {
        it('should have all key Islamic date labels', () => {
            expect(ISLAMIC_DATES.israkMikraj).toBeDefined();
            expect(ISLAMIC_DATES.ramadhanStart).toBeDefined();
            expect(ISLAMIC_DATES.laylatulQadr).toBeDefined();
            expect(ISLAMIC_DATES.eidFitri).toBeDefined();
            expect(ISLAMIC_DATES.dayOfArafah).toBeDefined();
            expect(ISLAMIC_DATES.eidAdha).toBeDefined();
            expect(ISLAMIC_DATES.islamicNewYear).toBeDefined();
            expect(ISLAMIC_DATES.mawlidNabi).toBeDefined();
        });
    });

    describe('UI_LABELS', () => {
        it('should have settings labels', () => {
            expect(UI_LABELS.settings).toBe('Tetapan');
            expect(UI_LABELS.dailyReminders).toBe('Peringatan Harian');
        });

        it('should have audio mode labels', () => {
            expect(UI_LABELS.mute).toBe('Senyap');
            expect(UI_LABELS.chime).toBe('Bunyi');
            expect(UI_LABELS.adhan).toBe('Azan');
        });

        it('should have action labels', () => {
            expect(UI_LABELS.quit).toBe('Keluar');
            expect(UI_LABELS.close).toBe('Tutup');
        });
    });

    describe('NOTIFICATIONS', () => {
        it('should generate prayer time notification', () => {
            expect(NOTIFICATIONS.prayerTime('Subuh')).toBe('Telah masuk waktu Subuh');
            expect(NOTIFICATIONS.prayerTime('Zohor')).toBe('Telah masuk waktu Zohor');
        });

        it('should have Jumuah reminder', () => {
            expect(NOTIFICATIONS.jumuahReminder).toBe("Jangan lupa baca Surah Al-Kahf hari ini.");
        });

        it('should generate countdown messages', () => {
            expect(NOTIFICATIONS.daysToRamadhan(5)).toBe('5 hari lagi ke Ramadhan');
            expect(NOTIFICATIONS.daysToEidFitri(3)).toBe('3 hari lagi ke Hari Raya');
        });
    });
});
