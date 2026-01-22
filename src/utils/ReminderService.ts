import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { FRIDAY_REMINDER, REMINDERS } from '../data/reminders';

let reminderInterval: ReturnType<typeof setInterval> | null = null;
const CHECK_INTERVAL = 60 * 1000; // Check every minute

/**
 * Checks if it's time to send a reminder.
 * Schedule: 
 * - Morning: 09:00 - 09:01
 * - Evening: 21:00 - 21:01 (9 PM)
 */
const checkTimeAndNotify = async () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 5 = Friday
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Trigger window: The first minute of the hour
    if (minute !== 0) return;

    // Morning Slot (9 AM) or Evening Slot (9 PM)
    if (hour === 9 || hour === 21) {
        await triggerReminder(day);
    }
};

const triggerReminder = async (dayOfWeek: number) => {
    let hasPermission = await isPermissionGranted();
    if (!hasPermission) {
        const permission = await requestPermission();
        hasPermission = permission === 'granted';
    }

    if (!hasPermission) return;

    let title = "Sajda Reminder";
    let body = "";

    // Friday Logic
    if (dayOfWeek === 5) { // Friday
        title = "Jumu'ah Mubarak";
        body = FRIDAY_REMINDER;
    } else {
        // Random Reminder
        const randomIndex = Math.floor(Math.random() * REMINDERS.length);
        body = REMINDERS[randomIndex];
    }

    sendNotification({
        title,
        body,
        sound: 'default',
    });
};

export const startReminderService = () => {
    if (reminderInterval) return; // Already running

    // Run immediately on start to check (optional, but good for debugging if started exactly at :00)
    checkTimeAndNotify();

    reminderInterval = setInterval(checkTimeAndNotify, CHECK_INTERVAL);
    console.log("Reminder Service Started");
};

export const stopReminderService = () => {
    if (reminderInterval) {
        clearInterval(reminderInterval);
        reminderInterval = null;
        console.log("Reminder Service Stopped");
    }
};
