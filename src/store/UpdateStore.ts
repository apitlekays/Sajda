import { create } from 'zustand';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { trackError } from '../utils/Analytics';

interface UpdateState {
    updateAvailable: Update | null;
    isChecking: boolean;
    isDownloading: boolean;
    isInstalling: boolean;
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
    isInstalling: false,
    downloadProgress: 0,
    error: null,

    checkForUpdates: async () => {
        set({ isChecking: true, error: null });
        try {
            const update = await check();
            if (update) {
                console.log(`Update available: ${update.version}`);
                set({ updateAvailable: update });
            } else {
                console.log('No update available');
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
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

            console.log('Starting download and install...');

            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        contentLength = event.data.contentLength || 0;
                        console.log(`Download started, size: ${contentLength} bytes`);
                        break;
                    case 'Progress':
                        downloaded += event.data.chunkLength;
                        if (contentLength > 0) {
                            const progress = (downloaded / contentLength) * 100;
                            set({ downloadProgress: progress });
                        }
                        break;
                    case 'Finished':
                        console.log('Download finished, preparing to install...');
                        set({ downloadProgress: 100 });
                        break;
                }
            });

            // Download and install completed - now relaunch
            console.log('Installation complete, relaunching app...');
            set({ isDownloading: false, isInstalling: true });

            // Small delay to ensure UI updates before relaunch
            await new Promise(resolve => setTimeout(resolve, 500));

            // Relaunch the app - this should quit and restart
            await relaunch();

            // If we get here, relaunch didn't work (shouldn't happen normally)
            console.error('Relaunch did not terminate the app');
            set({ isInstalling: false, error: 'Relaunch failed. Please restart the app manually.' });

        } catch (error) {
            console.error('Failed to download/install update:', error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            set({
                isDownloading: false,
                isInstalling: false,
                downloadProgress: 0,
                error: `Update failed: ${errorMsg}`
            });
            trackError('update_install', errorMsg);
        }
    },

    dismissUpdate: () => {
        set({ updateAvailable: null, error: null, downloadProgress: 0 });
    },
}));
