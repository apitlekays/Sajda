import { create } from 'zustand';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { trackError } from '../utils/Analytics';

interface UpdateState {
    updateAvailable: Update | null;
    isChecking: boolean;
    isDownloading: boolean;
    downloadProgress: number;
    error: string | null;

    checkForUpdates: () => Promise<void>;
    downloadAndInstall: () => Promise<void>;
    dismissUpdate: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
    updateAvailable: null,
    isChecking: false,
    isDownloading: false,
    downloadProgress: 0,
    error: null,

    checkForUpdates: async () => {
        set({ isChecking: true, error: null });
        try {
            const update = await check();
            if (update) {
                console.log(`Update available: ${update.version}`);
                set({ updateAvailable: update });
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
            // Don't show error to user for background checks - just log it
            trackError('update_check', error instanceof Error ? error.message : 'Unknown error');
        } finally {
            set({ isChecking: false });
        }
    },

    downloadAndInstall: async () => {
        const update = get().updateAvailable;
        if (!update) return;

        set({ isDownloading: true, downloadProgress: 0, error: null });
        try {
            let downloaded = 0;
            let contentLength = 0;

            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        contentLength = event.data.contentLength || 0;
                        console.log(`Download started, size: ${contentLength}`);
                        break;
                    case 'Progress':
                        downloaded += event.data.chunkLength;
                        if (contentLength > 0) {
                            const progress = (downloaded / contentLength) * 100;
                            set({ downloadProgress: progress });
                        }
                        break;
                    case 'Finished':
                        console.log('Download finished');
                        set({ downloadProgress: 100 });
                        break;
                }
            });

            // Relaunch the app after install
            console.log('Relaunching app...');
            await relaunch();
        } catch (error) {
            console.error('Failed to install update:', error);
            set({ error: `Failed to install update: ${error}` });
            trackError('update_install', error instanceof Error ? error.message : 'Unknown error');
        } finally {
            set({ isDownloading: false });
        }
    },

    dismissUpdate: () => {
        set({ updateAvailable: null, error: null });
    },
}));
