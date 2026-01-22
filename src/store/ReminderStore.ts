import { create } from 'zustand';

// Types for raw JSON data
interface BukhariVolume {
    name: string;
    books: {
        name: string;
        hadiths: {
            info: string;
            by: string;
            text: string;
        }[];
    }[];
}

interface DuaItem {
    title: string;
    arabic?: string;
    latin?: string;
    translation: string;
    benefits?: string;
    source: string;
}

// Unified Reminder Type
export interface ReminderContent {
    id: string; // Unique ID for tracking seen state
    type: 'hadith' | 'dua';
    title: string;
    body: string;
    description?: string; // Extra context (e.g. narrator or benefits)
    source?: string; // Citation
    arabic?: string; // Only for Dua
}

interface ReminderState {
    activeReminder: ReminderContent | null;
    isModalOpen: boolean;
    dataLoaded: boolean;

    // Actions
    triggerNewReminder: () => Promise<ReminderContent>;
    openModal: () => void;
    closeModal: () => void;
    setReminder: (reminder: ReminderContent) => void;
}

export const useReminderStore = create<ReminderState>((set) => ({
    activeReminder: null,
    isModalOpen: false,
    dataLoaded: false,

    triggerNewReminder: async () => {
        // dynamic import to avoid initial bundle bloat
        const [bukhariModule, duaModule] = await Promise.all([
            import('../data/sahih_bukhari.json'),
            import('../data/dua.json')
        ]);

        const bukhariData = bukhariModule.default as BukhariVolume[];
        const duaData = duaModule.default as DuaItem[];

        // Randomly choose between Hadith (70%) or Dua (30%)? Or 50/50?
        // Let's do 50/50 for variety.
        const useHadith = Math.random() > 0.5;

        let reminder: ReminderContent;

        if (useHadith) {
            // Pick Random Volume -> Book -> Hadith
            const volIdx = Math.floor(Math.random() * bukhariData.length);
            const volume = bukhariData[volIdx];

            const bookIdx = Math.floor(Math.random() * volume.books.length);
            const book = volume.books[bookIdx];

            const hadithIdx = Math.floor(Math.random() * book.hadiths.length);
            const hadith = book.hadiths[hadithIdx];

            reminder = {
                id: `hadith-${volIdx}-${bookIdx}-${hadithIdx}`,
                type: 'hadith',
                title: "Hadith of the Day",
                body: hadith.text,
                description: hadith.by,
                source: `Sahih Bukhari: ${hadith.info.replace(/:/g, '').trim()}`
            };
        } else {
            // Pick Random Dua
            const idx = Math.floor(Math.random() * duaData.length);
            const dua = duaData[idx];

            reminder = {
                id: `dua-${idx}`,
                type: 'dua',
                title: dua.title,
                body: dua.translation,
                arabic: dua.arabic,
                description: dua.benefits,
                source: dua.source
            };
        }

        set({ activeReminder: reminder, dataLoaded: true });
        return reminder;
    },

    openModal: () => set({ isModalOpen: true }),
    closeModal: () => set({ isModalOpen: false }),
    setReminder: (reminder) => set({ activeReminder: reminder })
}));
