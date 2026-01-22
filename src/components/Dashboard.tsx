import { useEffect, useState } from "react";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { usePrayerStore } from "../store/PrayerStore";
import { useTrackerStore } from "../store/TrackerStore";
import { useSettingsStore, AudioMode } from "../store/SettingsStore";
import { Settings, X, Volume2, VolumeX, Bell, Check, Navigation } from "lucide-react";
import { ZONE_MAPPING } from "../utils/ZoneData";

export const Dashboard = () => {
    const { todayTimes, nextPrayer, fetchTimes, updateCountdown, loading, zone } = usePrayerStore();
    const { isChecked, togglePrayer } = useTrackerStore();
    const { getMode, cycleAudioMode, remindersEnabled, toggleReminders } = useSettingsStore();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

    // 3. Reminder Service
    useEffect(() => {
        import("../utils/ReminderService").then(({ startReminderService, stopReminderService }) => {
            if (remindersEnabled) {
                startReminderService();
            } else {
                stopReminderService();
            }
        });
    }, [remindersEnabled]);

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
                    {d}<sup className="text-[0.6em]">{getOrdinal(d)}</sup> {monthName} {y}
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

    const prayerMap: Record<string, string> = {
        fajr: "Subuh",
        syuruk: "Syuruk",
        dhuhr: "Zohor",
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
                    "fixed inset-0 z-50 bg-background/95 backdrop-blur-xl transition-transform duration-300 ease-in-out flex flex-col p-6 space-y-6",
                    isSettingsOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold font-buda">Settings</h2>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-muted-foreground">Settings content will go here in V0.2.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                import("../utils/AudioService").then(({ AudioService }) => {
                                    AudioService.playAthan("fajr");
                                });
                            }}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Test Audio (Fajr)
                        </button>
                        <button
                            onClick={() => {
                                import("../utils/AudioService").then(({ AudioService }) => {
                                    AudioService.stop();
                                });
                            }}
                            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors"
                        >
                            Stop
                        </button>
                    </div>

                    <div className="h-px bg-border my-2" />

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Daily Reminders</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">9am & 9pm (+ Al-Kahf on Fridays)</span>
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
                    className="w-full h-auto drop-shadow-md opacity-90 hover:opacity-100 transition-opacity rounded-b-md"
                />
            </div>

            {/* Header / Date */}
            <div className="text-center space-y-1 font-buda mt-6">
                <h2 className="text-xl font-bold text-foreground tracking-wide leading-tight">
                    {todayTimes ? renderHijri(todayTimes.hijri) : "..."}
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
                            {/* Left: Audio Toggle */}
                            <button
                                onClick={(e) => { e.stopPropagation(); cycleAudioMode(p); }}
                                className="p-1.5 hover:bg-background/50 rounded-full transition-colors"
                            >
                                {getAudioIcon(audioMode)}
                            </button>

                            {/* Center: Name & Time */}
                            <div className="flex-1 px-3 flex items-center justify-between">
                                <span className="font-medium capitalize text-sm">{prayerMap[p] || p}</span>
                                <span>{displayTime}</span>
                            </div>

                            {/* Right: Circular Checkbox */}
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
                        </div>
                    )
                })}
            </div>

            {/* Footer / Location */}
            <div className="mt-auto py-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                <Navigation className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{ZONE_MAPPING[zone] || zone}</span>
            </div>
        </div>
    );
};
