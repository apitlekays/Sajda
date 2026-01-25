/**
 * Central Malay Language Dictionary
 *
 * This file contains all Malay translations and terms used throughout the app
 * to ensure consistency across notifications, UI labels, and settings.
 *
 * Standard: Malaysian Malay (Bahasa Malaysia) spelling conventions
 */

// =============================================================================
// PRAYER NAMES
// =============================================================================

/**
 * Internal prayer keys used in the codebase (API/data layer)
 */
export type PrayerKey = 'fajr' | 'syuruk' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

/**
 * Prayer name translations (English key -> Malay display)
 */
export const PRAYER_NAMES: Record<PrayerKey, string> = {
    fajr: 'Subuh',
    syuruk: 'Syuruk',
    dhuhr: 'Zohor',
    asr: 'Asar',
    maghrib: 'Maghrib',
    isha: 'Isyak',
};

/**
 * Get prayer display name with Friday handling
 */
export function getPrayerDisplayName(key: PrayerKey, isFriday: boolean = false): string {
    if (key === 'dhuhr' && isFriday) {
        return 'Jumaat';
    }
    return PRAYER_NAMES[key];
}

// =============================================================================
// HIJRI MONTH NAMES
// =============================================================================

/**
 * Hijri month names in Malay
 * Index 0 = Muharram (month 1), Index 11 = Zulhijjah (month 12)
 */
export const HIJRI_MONTHS: string[] = [
    'Muharram',
    'Safar',
    'Rabiulawal',
    'Rabiulakhir',
    'Jamadilawal',
    'Jamadilakhir',
    'Rejab',
    'Syaaban',
    'Ramadhan',  // Note: Use 'dh' spelling (Malaysian standard)
    'Syawal',
    'Zulkaedah',
    'Zulhijjah',
];

/**
 * Get Hijri month name by number (1-12)
 */
export function getHijriMonthName(month: number): string {
    if (month < 1 || month > 12) return '';
    return HIJRI_MONTHS[month - 1];
}

// =============================================================================
// ISLAMIC KEY DATES
// =============================================================================

/**
 * Islamic key date labels in Malay/English mix (common Malaysian usage)
 */
export const ISLAMIC_DATES = {
    israkMikraj: "Israk & Mikraj",
    ramadhanStart: "Ramadhan Mubarak!",
    laylatulQadr: "Laylatul Qadr",
    eidFitri: "Selamat Hari Raya Aidilfitri!",
    dayOfArafah: "Hari Arafah",
    eidAdha: "Selamat Hari Raya Aidiladha!",
    islamicNewYear: "Salam Maal Hijrah!",
    mawlidNabi: "Maulidur Rasul",
} as const;

// =============================================================================
// UI LABELS
// =============================================================================

/**
 * Common UI labels in Malay
 */
export const UI_LABELS = {
    // Settings
    settings: 'Tetapan',
    dailyReminders: 'Peringatan Harian',
    jumuahReminder: "Peringatan Jumu'ah",
    islamicKeyDates: 'Tarikh Penting Islam',
    adhanVoice: 'Suara Azan',
    calculationMethod: 'Kaedah Kiraan',

    // Prayer-related
    prayerTimes: 'Waktu Solat',
    nextPrayer: 'Solat Seterusnya',
    until: 'lagi',

    // Audio modes
    mute: 'Senyap',
    chime: 'Bunyi',
    adhan: 'Azan',

    // Actions
    quit: 'Keluar',
    close: 'Tutup',
} as const;

// =============================================================================
// NOTIFICATION MESSAGES
// =============================================================================

/**
 * Notification message templates
 */
export const NOTIFICATIONS = {
    /**
     * Get prayer time notification message
     */
    prayerTime: (prayerName: string): string =>
        `Telah masuk waktu ${prayerName}`,

    /**
     * Jumuah reminder message
     */
    jumuahReminder: "Jangan lupa baca Surah Al-Kahf hari ini.",

    /**
     * Countdown message template
     */
    daysToRamadhan: (days: number): string =>
        `${days} hari lagi ke Ramadhan`,

    daysToEidFitri: (days: number): string =>
        `${days} hari lagi ke Hari Raya`,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format Hijri date string for display
 * @param year Hijri year
 * @param month Hijri month (1-12)
 * @param day Hijri day
 */
export function formatHijriDate(year: number, month: number, day: number): string {
    const monthName = getHijriMonthName(month);
    return `${day} ${monthName} ${year}`;
}
