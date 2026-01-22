import { invoke } from "@tauri-apps/api/core";
import { resolveResource } from "@tauri-apps/api/path";
import { useSettingsStore } from "../store/SettingsStore";

export const AudioService = {
    async playAthan(prayerName: string) {
        try {
            const { getMode } = useSettingsStore.getState();
            const mode = getMode(prayerName);

            if (mode === 'mute') {
                console.log(`Audio is muted for ${prayerName}`);
                return;
            }

            // Determine file name based on mode
            // For V1, we handle 'chime' and 'adhan' same or different files?
            // Let's assume user has `chime.mp3` and `adhan.mp3` or `fajr.mp3`.
            // Fallback for now since we don't have files: Just try to play "chime.mp3"

            let fileName = "chime.mp3";
            if (mode === 'adhan') {
                fileName = "adhan.mp3";
                if (prayerName === 'fajr') fileName = "fajr.mp3";
            }

            console.log(`Attempting to play audio: ${fileName} for ${prayerName} (${mode})`);

            // Resolve absolute path to the resource
            // Note: In 'tauri dev', resources might need to be in `src-tauri/resources`
            const resourcePath = await resolveResource(`resources/audio/${fileName}`);
            console.log("Resolved Resource Path:", resourcePath);

            await invoke("play_audio_file", { filePath: resourcePath });
        } catch (error) {
            console.error("Failed to play audio:", error);
        }
    },

    async stop() {
        try {
            await invoke("stop_audio");
        } catch (error) {
            console.error("Failed to stop audio:", error);
        }
    }
};
