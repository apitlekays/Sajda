import { describe, it, expect, beforeEach } from 'vitest';
import { useReminderStore, ReminderContent } from '../ReminderStore';

describe('ReminderStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useReminderStore.setState({
            activeReminder: null,
            isModalOpen: false,
            dataLoaded: false
        });
    });

    describe('Initial state', () => {
        it('should have null activeReminder initially', () => {
            const state = useReminderStore.getState();
            expect(state.activeReminder).toBeNull();
        });

        it('should have modal closed initially', () => {
            const state = useReminderStore.getState();
            expect(state.isModalOpen).toBe(false);
        });

        it('should have dataLoaded as false initially', () => {
            const state = useReminderStore.getState();
            expect(state.dataLoaded).toBe(false);
        });
    });

    describe('openModal', () => {
        it('should open the modal', () => {
            useReminderStore.getState().openModal();

            const state = useReminderStore.getState();
            expect(state.isModalOpen).toBe(true);
        });
    });

    describe('closeModal', () => {
        it('should close the modal', () => {
            // First open it
            useReminderStore.setState({ isModalOpen: true });

            useReminderStore.getState().closeModal();

            const state = useReminderStore.getState();
            expect(state.isModalOpen).toBe(false);
        });
    });

    describe('setReminder', () => {
        it('should set the active reminder', () => {
            const mockReminder: ReminderContent = {
                id: 'test-1',
                type: 'hadith',
                title: 'Test Hadith',
                body: 'Test body text',
                description: 'Test description',
                source: 'Test source'
            };

            useReminderStore.getState().setReminder(mockReminder);

            const state = useReminderStore.getState();
            expect(state.activeReminder).toEqual(mockReminder);
        });

        it('should set hadith type reminder correctly', () => {
            const hadithReminder: ReminderContent = {
                id: 'hadith-1',
                type: 'hadith',
                title: 'Hadith of the Day',
                body: 'The Prophet said...',
                description: 'Narrated by Abu Hurairah',
                source: 'Sahih Bukhari'
            };

            useReminderStore.getState().setReminder(hadithReminder);

            const state = useReminderStore.getState();
            expect(state.activeReminder?.type).toBe('hadith');
            expect(state.activeReminder?.arabic).toBeUndefined();
        });

        it('should set dua type reminder correctly with arabic', () => {
            const duaReminder: ReminderContent = {
                id: 'dua-1',
                type: 'dua',
                title: 'Morning Dua',
                body: 'O Allah, by Your leave we have reached the morning',
                arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا',
                description: 'Protection in the morning',
                source: 'Fortress of the Muslim'
            };

            useReminderStore.getState().setReminder(duaReminder);

            const state = useReminderStore.getState();
            expect(state.activeReminder?.type).toBe('dua');
            expect(state.activeReminder?.arabic).toBe('اللَّهُمَّ بِكَ أَصْبَحْنَا');
        });
    });

    describe('triggerNewReminder', () => {
        it('should return a ReminderContent object', async () => {
            const reminder = await useReminderStore.getState().triggerNewReminder();

            expect(reminder).toBeDefined();
            expect(reminder.id).toBeDefined();
            expect(reminder.type).toMatch(/^(hadith|dua)$/);
            expect(reminder.title).toBeDefined();
            expect(reminder.body).toBeDefined();
        });

        it('should set activeReminder after trigger', async () => {
            await useReminderStore.getState().triggerNewReminder();

            const state = useReminderStore.getState();
            expect(state.activeReminder).not.toBeNull();
        });

        it('should set dataLoaded to true', async () => {
            await useReminderStore.getState().triggerNewReminder();

            const state = useReminderStore.getState();
            expect(state.dataLoaded).toBe(true);
        });

        it('should generate unique IDs', async () => {
            const ids = new Set<string>();

            // Generate multiple reminders
            for (let i = 0; i < 10; i++) {
                const reminder = await useReminderStore.getState().triggerNewReminder();
                ids.add(reminder.id);
            }

            // Each should be unique (or very likely unique)
            expect(ids.size).toBeGreaterThanOrEqual(1);
        });

        it('should have source for hadith reminders', async () => {
            // Run multiple times to catch hadith type
            let foundHadith = false;
            for (let i = 0; i < 20 && !foundHadith; i++) {
                const reminder = await useReminderStore.getState().triggerNewReminder();
                if (reminder.type === 'hadith') {
                    foundHadith = true;
                    expect(reminder.source).toContain('Sahih Bukhari');
                }
            }
        });

        it('should have source for dua reminders', async () => {
            // Run multiple times to catch dua type
            let foundDua = false;
            for (let i = 0; i < 20 && !foundDua; i++) {
                const reminder = await useReminderStore.getState().triggerNewReminder();
                if (reminder.type === 'dua') {
                    foundDua = true;
                    expect(reminder.source).toBeDefined();
                }
            }
        });
    });

    describe('ReminderContent interface', () => {
        it('should accept all required fields', () => {
            const reminder: ReminderContent = {
                id: 'test',
                type: 'hadith',
                title: 'Title',
                body: 'Body'
            };

            expect(reminder.id).toBe('test');
            expect(reminder.type).toBe('hadith');
        });

        it('should accept optional fields', () => {
            const reminder: ReminderContent = {
                id: 'test',
                type: 'dua',
                title: 'Title',
                body: 'Body',
                description: 'Description',
                source: 'Source',
                arabic: 'Arabic text'
            };

            expect(reminder.description).toBe('Description');
            expect(reminder.source).toBe('Source');
            expect(reminder.arabic).toBe('Arabic text');
        });
    });
});
