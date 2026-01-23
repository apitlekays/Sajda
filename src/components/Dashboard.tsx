import { useEffect, useState } from "react";
import { listen } from '@tauri-apps/api/event';
import { isPermissionGranted, sendNotification } from '@tauri-apps/plugin-notification';
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { usePrayerStore } from "../store/PrayerStore";
import { useTrackerStore } from "../store/TrackerStore";
import { useSettingsStore, AudioMode } from "../store/SettingsStore";
import { useReminderStore } from "../store/ReminderStore";
import { Settings, X, Volume2, VolumeX, Bell, Check, Navigation, Play, Clock, Plus, BookOpen, Quote, AlertTriangle, Heart } from "lucide-react";
import { ZONE_MAPPING } from "../utils/ZoneData";

export const Dashboard = () => {
    const { todayTimes, nextPrayer, fetchTimes, updateCountdown, loading, zone } = usePrayerStore();
    const { isChecked, togglePrayer } = useTrackerStore();
    const { activeReminder, isModalOpen, closeModal, openModal, triggerNewReminder } = useReminderStore();
    const { getMode, cycleAudioMode,
        remindersEnabled, toggleReminders,
        randomReminders, toggleRandomReminders,
        reminderTimes, addReminderTime, removeReminderTime,
        alkahfEnabled, toggleAlKahf,
        adhanSelection, setAdhanSelection,
        calculationMethod, setCalculationMethod
    } = useSettingsStore();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [playingPreview, setPlayingPreview] = useState<string | null>(null);
    const [newReminderTime, setNewReminderTime] = useState("");
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Prevent initial transition flash by deferring animation release
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 100); // 100ms delay to ensure initial paint is stable
        return () => clearTimeout(timer);
    }, []);

    // ... (rest of code)

    // ...


    useEffect(() => {
        // Request permission immediately on startup
        import("../utils/ReminderService").then(async ({ requestNotificationPermission }) => {
            const granted = await requestNotificationPermission();
            setPermissionDenied(!granted);
        });
    }, []);

    // Listen for reminder triggers from Rust scheduler
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        const setup = async () => {
            unlisten = await listen<string>("reminder-trigger", async () => {
                try {
                    const reminder = await triggerNewReminder();

                    // Send notification as visual/audio alert
                    const hasPermission = await isPermissionGranted();
                    if (hasPermission) {
                        const MAX_BODY = 100;
                        let body = reminder.body;
                        if (body.length > MAX_BODY) {
                            body = body.substring(0, MAX_BODY).trim() + "...";
                        }

                        sendNotification({
                            title: reminder.title,
                            body,
                        });
                    }

                    // Open modal directly (macOS doesn't support notification click events)
                    setTimeout(() => openModal(), 500);
                } catch (err) {
                    console.error("Failed to process reminder trigger:", err);
                }
            });
        };

        setup();
        return () => { if (unlisten) unlisten(); };
    }, [triggerNewReminder, openModal]);

    // 1. Initial Fetch
    useEffect(() => {
        fetchTimes();
    }, [fetchTimes]);

    // 2. Countdown Interval
    useEffect(() => {
        const interval = setInterval(() => {
            updateCountdown();
        }, 1000);
        return () => clearInterval(interval);
    }, [updateCountdown]);



    const getOrdinal = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    const renderHijri = (hijriStr: string) => {
        if (!hijriStr) return null;
        try {
            const [y, m, d] = hijriStr.split("-").map(Number);
            const months = [
                "Muharram", "Safar", "Rabiulawal", "Rabiulakhir",
                "Jamadilawal", "Jamadilakhir", "Rejab", "Syaaban",
                "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah"
            ];
            const monthName = months[m - 1] || "";
            return (
                <>
                    {d} {monthName} {y}
                </>
            );
        } catch (e) {
            return hijriStr;
        }
    };

    const renderGregorian = () => {
        const now = new Date();
        const d = now.getDate();
        const month = format(now, "MMMM");
        const year = now.getFullYear();

        return (
            <>
                {d}<sup className="text-[0.6em]">{getOrdinal(d)}</sup> {month} {year}
            </>
        );
    };

    // Check if Friday for Jumaat naming
    const isFriday = new Date().getDay() === 5;

    const prayerMap: Record<string, string> = {
        fajr: "Subuh",
        syuruk: "Syuruk",
        dhuhr: isFriday ? "Jumaat" : "Zohor",
        asr: "Asar",
        maghrib: "Maghrib",
        isha: "Isyak"
    };

    const getAudioIcon = (mode: AudioMode) => {
        switch (mode) {
            case 'mute': return <VolumeX className="w-4 h-4 text-muted-foreground/50" />;
            case 'chime': return <Bell className="w-4 h-4 text-primary" />;
            case 'adhan': return <Volume2 className="w-4 h-4 text-primary" />;
        }
    };

    if (loading || !todayTimes) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground text-sm">Fetching Prayer Times...</p>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-full p-4 space-y-2 overflow-hidden">
            {/* Settings Drawer */}
            <div
                className={cn(
                    "fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col p-6 space-y-6",
                    isMounted ? "transition-transform duration-300 ease-in-out" : "duration-0",
                    isSettingsOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold font-buda">Settings</h2>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">


                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Daily Reminders</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">Hadith & Zikr notifications</span>
                        </div>
                        <button
                            onClick={toggleReminders}
                            className={cn(
                                "w-9 h-5 rounded-full transition-colors relative",
                                remindersEnabled ? "bg-primary" : "bg-muted"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200",
                                remindersEnabled ? "left-5" : "left-1"
                            )} />
                        </button>
                    </div>

                    {/* Daily Reminder Sub-options */}
                    {remindersEnabled && (
                        <div className="ml-1 pl-3 border-l-2 border-primary/20 space-y-3">
                            {/* Permission Warning */}
                            {permissionDenied && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="text-[10px] text-muted-foreground">
                                        <p className="font-semibold text-amber-500 mb-1">Notifications Denied</p>
                                        <p className="leading-relaxed">Enable in <span className="font-mono bg-muted/50 px-1 rounded">System Settings &gt; Notifications &gt; Sajda</span></p>
                                    </div>
                                </div>
                            )}

                            {/* Random Times Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium">Random times</span>
                                    <span className="text-[10px] text-muted-foreground leading-tight">
                                        3 reminders at varied times daily
                                    </span>
                                </div>
                                <button
                                    onClick={toggleRandomReminders}
                                    className={cn(
                                        "w-9 h-5 rounded-full transition-colors relative",
                                        randomReminders ? "bg-primary" : "bg-muted"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200",
                                        randomReminders ? "left-5" : "left-1"
                                    )} />
                                </button>
                            </div>

                            {/* Custom Times (only shown when NOT random) */}
                            {!randomReminders && (
                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        {reminderTimes.map((time) => (
                                            <div key={time} className="flex items-center bg-muted/40 px-2 py-1 rounded text-xs gap-2">
                                                <Clock className="w-3 h-3 opacity-50" />
                                                <span>{time}</span>
                                                <button
                                                    onClick={() => removeReminderTime(time)}
                                                    className="hover:text-destructive transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Time Input */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={newReminderTime}
                                            className="px-2 py-1 text-xs rounded border bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary"
                                            onChange={(e) => setNewReminderTime(e.target.value)}
                                        />
                                        <button
                                            onClick={() => {
                                                if (newReminderTime) {
                                                    addReminderTime(newReminderTime);
                                                    setNewReminderTime("");
                                                }
                                            }}
                                            disabled={!newReminderTime}
                                            className="p-1 rounded bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        <span className="text-[10px] text-muted-foreground">Select time to add</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}


                    <div className="h-px bg-border my-2" />

                    {/* Jumu'ah Reminders */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Jumu'ah Reminder</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">Surah Al-Kahf at Zuhur/Jumaat</span>
                        </div>
                        <button
                            onClick={toggleAlKahf}
                            className={cn(
                                "w-9 h-5 rounded-full transition-colors relative",
                                alkahfEnabled ? "bg-emerald-500" : "bg-muted"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-200",
                                alkahfEnabled ? "left-5" : "left-1"
                            )} />
                        </button>
                    </div>

                    <div className="h-px bg-border my-2" />

                    <div className="space-y-3">
                        <span className="text-sm font-medium">Adhan Voice</span>
                        <div className="grid grid-cols-2 gap-2">
                            {(['Nasser', 'Ahmed'] as const).map((voice) => (
                                <div
                                    key={voice}
                                    onClick={() => setAdhanSelection(voice)}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200",
                                        adhanSelection === voice
                                            ? "border-primary bg-primary/5 text-primary"
                                            : "border-muted/40 hover:border-muted-foreground/30 hover:bg-muted/30 text-muted-foreground"
                                    )}
                                >
                                    <span className="text-sm font-semibold">{voice}</span>

                                    {/* Preview Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();

                                            // Toggle Logic
                                            if (playingPreview === voice) {
                                                // Stop
                                                import("../utils/AudioService").then(({ AudioService }) => {
                                                    AudioService.stop();
                                                });
                                                setPlayingPreview(null);
                                            } else {
                                                // Play
                                                import("@tauri-apps/api/core").then(({ invoke }) => {
                                                    import("@tauri-apps/api/path").then(({ resolveResource }) => {
                                                        resolveResource(`resources/audio/${voice}.mp3`).then(path => {
                                                            invoke("play_audio_file", { filePath: path });
                                                        });
                                                    });
                                                });
                                                setPlayingPreview(voice);
                                            }
                                        }}
                                        className="mt-2 p-1 rounded-full hover:bg-background/50 transition-colors"
                                        title={playingPreview === voice ? "Stop" : "Preview"}
                                    >
                                        {playingPreview === voice ? (
                                            <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                                        ) : (
                                            <Play className="w-4 h-4 fill-current opacity-70" />
                                        )}
                                    </button>

                                    {/* Active Check */}
                                    {adhanSelection === voice && (
                                        <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-0.5">
                                            <Check className="w-3 h-3 text-white stroke-[3]" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center pt-1">
                            *Subuh always uses Mishary
                        </p>
                    </div>

                    <div className="h-px bg-border my-2" />

                    {/* Calculation Method */}
                    <div className="space-y-3">
                        <span className="text-sm font-medium">Calculation Method</span>
                        <select
                            value={calculationMethod}
                            onChange={(e) => setCalculationMethod(e.target.value)}
                            className="w-full p-2 rounded-md bg-muted/40 border border-muted-foreground/20 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="JAKIM">JAKIM (Malaysia)</option>
                            <option value="Singapore">MUIS (Singapore)</option>
                            <option value="MWL">Muslim World League</option>
                            <option value="ISNA">ISNA (North America)</option>
                            <option value="Makkah">Umm Al-Qura (Makkah)</option>
                            <option value="Egypt">Egyptian General Authority</option>
                            <option value="Karachi">Karachi (Hanfi)</option>
                            <option value="Tehran">Tehran (Geophysics)</option>
                            <option value="Gulf">Gulf (Dubai)</option>
                            <option value="Kuwait">Kuwait</option>
                            <option value="Qatar">Qatar</option>
                        </select>
                        <p className="text-[10px] text-muted-foreground pt-1">
                            Use "JAKIM" for official Malaysian times (API). Others use local calculation execution.
                        </p>
                    </div>

                    <div className="h-px bg-border my-2" />

                </div>

                {/* Credit Footer */}
                <div className="pt-4 text-center text-[10px] text-muted-foreground/60">
                    <p className="flex items-center justify-center gap-1">
                        Developed with <Heart className="w-3 h-3 text-red-400 fill-red-400" /> by Hafiz Hanif, PhD.
                    </p>
                </div>
            </div>

            {/* Top Bar: Settings (Left) & Logo (Right) */}
            <div className="absolute top-3 left-3 z-20">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors bg-background/20 rounded-full hover:bg-background/40 backdrop-blur-md"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {/* Logo - Draping effect */}
            <div className="absolute top-2 right-3 w-14 z-10">
                <img
                    src="/mapimlogo.webp"
                    alt="Logo"
                    className="w-full h-auto drop-shadow-md opacity-90 hover:opacity-100 transition-opacity rounded-b-md cursor-pointer"
                    onClick={() => {
                        setTimeout(async () => {
                            try {
                                const reminder = await triggerNewReminder();
                                const hasPermission = await isPermissionGranted();
                                if (hasPermission) {
                                    const MAX_BODY = 100;
                                    let body = reminder.body;
                                    if (body.length > MAX_BODY) {
                                        body = body.substring(0, MAX_BODY).trim() + "...";
                                    }
                                    sendNotification({ title: reminder.title, body });
                                }
                                setTimeout(() => openModal(), 500);
                            } catch (err) {
                                console.error("Easter egg reminder failed:", err);
                            }
                        }, 10000);
                    }}
                />
            </div>

            {/* Header / Date */}
            <div className="text-center space-y-1 font-buda mt-6">
                <h2 className="text-xl font-bold text-foreground tracking-wide leading-tight">
                    {todayTimes ? renderHijri(todayTimes.hijri || "") : "..."}
                </h2>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest opacity-90">
                    {renderGregorian()}
                </p>
            </div>

            {/* Main Countdown */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-1 py-1">
                <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full animate-pulse" />
                    <h1 className="relative text-6xl font-bold tracking-tighter text-primary font-saira tabular-nums">
                        {nextPrayer?.remaining || "--:--:--"}
                    </h1>
                </div>
                <p className="text-xl font-semibold text-foreground">
                    until <span className="text-primary capitalize">{nextPrayer ? (prayerMap[nextPrayer.name] || nextPrayer.name) : "..."}</span>
                </p>
            </div>

            {/* Prayer List Preview */}
            <div className="space-y-1">
                {["fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"].map((p) => {
                    // @ts-ignore
                    const timeVal = todayTimes[p];
                    const isNext = nextPrayer?.name === p;
                    const checked = isChecked(p);
                    const audioMode = getMode(p);

                    // Format UNIX timestamp (seconds)
                    let displayTime: React.ReactNode = "--:--";
                    if (timeVal) {
                        try {
                            const date = new Date(timeVal * 1000);
                            const timeStr = format(date, "hh:mm");
                            const period = format(date, "a");

                            displayTime = (
                                <span className="flex items-baseline text-sm">
                                    {timeStr}
                                    <span className="ml-1 px-[4px] py-[1px] border border-current rounded-[4px] text-[0.6em] font-extrabold tracking-wider opacity-80 leading-none self-start mt-1">
                                        {period}
                                    </span>
                                </span>
                            );
                        } catch (e) {
                            console.error("Date error", e);
                        }
                    }


                    return (
                        <div
                            key={p}
                            className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-md transition-all font-semibold select-none group",
                                isNext
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                            )}
                        >
                            {/* Left: Audio Toggle (Hidden for Syuruk) */}
                            {p !== "syuruk" ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); cycleAudioMode(p); }}
                                    className="p-1.5 hover:bg-background/50 rounded-full transition-colors"
                                >
                                    {getAudioIcon(audioMode)}
                                </button>
                            ) : (
                                <div className="w-7"></div> // Spacer
                            )}

                            {/* Center: Name & Time */}
                            <div className="flex-1 px-3 flex items-center justify-between">
                                <span className="font-medium capitalize text-sm">{prayerMap[p] || p}</span>
                                <span>{displayTime}</span>
                            </div>

                            {/* Right: Circular Checkbox (Hidden for Syuruk) */}
                            {p !== "syuruk" ? (
                                <button
                                    onClick={() => togglePrayer(p)}
                                    className={cn(
                                        "w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200",
                                        checked
                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                            : "border-muted-foreground/30 hover:border-primary/50 bg-background/50"
                                    )}
                                >
                                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                            ) : (
                                <div className="w-5"></div> // Spacer
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Reminder Modal Overlay */}
            {
                isModalOpen && activeReminder && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card w-full max-w-sm rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                                <div className="flex items-center gap-2 text-primary">
                                    {activeReminder.type === 'hadith' ? <BookOpen className="w-4 h-4" /> : <Quote className="w-4 h-4" />}
                                    <span className="font-semibold text-sm">{activeReminder.title}</span>
                                </div>
                                <button onClick={closeModal} className="hover:bg-destructive/10 hover:text-destructive p-1 rounded transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-5 overflow-y-auto space-y-4">
                                {/* Arabic (Dua) */}
                                {activeReminder.arabic && (
                                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                                        <p className="text-right font-traditional text-xl leading-relaxed font-semibold dir-rtl">
                                            {activeReminder.arabic}
                                        </p>
                                    </div>
                                )}

                                {/* Main Text */}
                                <div className="prose prose-sm dark:prose-invert">
                                    <p className="whitespace-pre-wrap leading-relaxed opacity-90">
                                        {activeReminder.body}
                                    </p>
                                </div>

                                {/* Metadata / Source */}
                                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                                    {activeReminder.description && (
                                        <p className="italic opacity-80">{activeReminder.description}</p>
                                    )}
                                    {activeReminder.source && (
                                        <p className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                                            Source: {activeReminder.source}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Footer / Location */}
            <div className="mt-auto py-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                <Navigation className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{todayTimes?.zone_name || ZONE_MAPPING[zone] || zone}</span>
            </div>
        </div >
    );
};
