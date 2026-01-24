/**
 * Hijri (Islamic) calendar utilities and key date detection.
 * Uses the Tabular Islamic Calendar algorithm for approximate conversion.
 */

interface HijriDate {
    year: number;
    month: number;
    day: number;
}

export interface KeyDateMessage {
    text: string;
    type: 'highlight' | 'countdown';
}

/** Convert Gregorian date to approximate Hijri date */
function gregorianToHijri(year: number, month: number, day: number): HijriDate {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y +
        Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

    const l = jdn - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
        Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
        Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const hijriMonth = Math.floor((24 * l3) / 709);
    const hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);
    const hijriYear = 30 * n + j - 30;

    return { year: hijriYear, month: hijriMonth, day: hijriDay };
}

/** Convert Hijri date to Julian Day Number */
function hijriToJdn(year: number, month: number, day: number): number {
    return Math.floor((11 * year + 3) / 30) + 354 * year +
        30 * month - Math.floor((month - 1) / 2) + day + 1948440 - 385;
}

/** Calculate days from current Hijri date to a target Hijri month/day */
function daysUntilHijri(current: HijriDate, targetMonth: number, targetDay: number): number {
    const todayJdn = hijriToJdn(current.year, current.month, current.day);
    let targetJdn = hijriToJdn(current.year, targetMonth, targetDay);

    // If already passed this year, use next Hijri year
    if (targetJdn <= todayJdn) {
        targetJdn = hijriToJdn(current.year + 1, targetMonth, targetDay);
    }

    return targetJdn - todayJdn;
}

/**
 * Get active Islamic key date messages for today.
 * Returns up to 2 messages (on-date displays + countdowns).
 *
 * Key dates (Hijri):
 * - 27 Rajab (month 7): Israk & Mikraj
 * - 1 Ramadhan (month 9): Start of Ramadhan (countdown 30 days before)
 * - 21/23/25/27/29 Ramadhan: Laylatul Qadr nights
 * - 1 Syawal (month 10): Eid al-Fitr (countdown 15 days before)
 * - 9 Dhul Hijjah (month 12): Day of Arafah
 * - 10 Dhul Hijjah (month 12): Eid al-Adha
 * - 1 Muharram (month 1): Islamic New Year
 * - 12 Rabi'ul Awal (month 3): Mawlid Nabi
 */
export function getIslamicKeyDateMessages(): KeyDateMessage[] {
    const now = new Date();
    const hijri = gregorianToHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const messages: KeyDateMessage[] = [];

    // === On-date displays ===

    // Islamic New Year - 1 Muharram
    if (hijri.month === 1 && hijri.day === 1) {
        messages.push({ text: "Islamic New Year", type: "highlight" });
    }

    // Mawlid Nabi - 12 Rabi'ul Awal
    if (hijri.month === 3 && hijri.day === 12) {
        messages.push({ text: "Mawlid Nabi", type: "highlight" });
    }

    // Israk & Mikraj - 27 Rajab
    if (hijri.month === 7 && hijri.day === 27) {
        messages.push({ text: "Israk & Mikraj", type: "highlight" });
    }

    // Start of Ramadhan - 1 Ramadhan
    if (hijri.month === 9 && hijri.day === 1) {
        messages.push({ text: "Ramadhan Mubarak!", type: "highlight" });
    }

    // Laylatul Qadr - odd nights of last 10 days of Ramadhan
    if (hijri.month === 9 && [21, 23, 25, 27, 29].includes(hijri.day)) {
        messages.push({ text: `Laylatul Qadr, Night ${hijri.day}`, type: "highlight" });
    }

    // Eid al-Fitr - 1 Syawal
    if (hijri.month === 10 && hijri.day === 1) {
        messages.push({ text: "Eid al-Fitr Mubarak!", type: "highlight" });
    }

    // Day of Arafah - 9 Dhul Hijjah
    if (hijri.month === 12 && hijri.day === 9) {
        messages.push({ text: "Day of Arafah", type: "highlight" });
    }

    // Eid al-Adha - 10 Dhul Hijjah
    if (hijri.month === 12 && hijri.day === 10) {
        messages.push({ text: "Eid al-Adha Mubarak!", type: "highlight" });
    }

    // === Countdowns ===

    // Ramadhan countdown - show ≤30 days before
    const daysToRamadhan = daysUntilHijri(hijri, 9, 1);
    if (daysToRamadhan > 0 && daysToRamadhan <= 30) {
        messages.push({ text: `${daysToRamadhan} days to Ramadhan`, type: "countdown" });
    }

    // Eid al-Fitr countdown - show ≤15 days before
    const daysToEid = daysUntilHijri(hijri, 10, 1);
    if (daysToEid > 0 && daysToEid <= 15) {
        messages.push({ text: `${daysToEid} days to Eid al-Fitr`, type: "countdown" });
    }

    return messages;
}
