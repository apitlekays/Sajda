# CLAUDE.md

## Project Overview

Sajda is a macOS menu bar application for Islamic prayer times and reminders. Built with Tauri v2 (Rust backend) and React 19 + TypeScript (frontend).

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 7, Tailwind CSS 3, Zustand (state), Framer Motion
- **Backend:** Rust, Tauri v2, Tokio, Rodio (audio), Salah (prayer calculations)
- **Platform:** macOS (menu bar app, 320x600px window, always-on-top)

## Commands

- `npm run dev` — Start Vite dev server (port 1420)
- `npm run build` — TypeScript check + Vite production build
- `npm run tauri dev` — Run full Tauri app in development
- `npm run tauri build` — Build production .app bundle
- `cargo build` — Build Rust backend (run from `src-tauri/`)
- `cargo check` — Type-check Rust code (run from `src-tauri/`)

## Project Structure

```
src/                    # React/TypeScript frontend
  components/           # UI components (Dashboard.tsx is main view)
  store/                # Zustand stores (Prayer, Reminder, Settings, Tracker)
  utils/                # Services (Audio, Location, Reminder, ZoneData, HijriDate)
  data/                 # Static data (reminders, dua.json, sahih_bukhari.json)
src-tauri/              # Rust/Tauri backend
  src/                  # Rust source (audio, jakim_api, prayer_engine, scheduler, settings)
  resources/audio/      # Adhan audio files
  tauri.conf.json       # Tauri app configuration
public/                 # Static assets, fonts, icons
```

## Architecture

- Frontend handles UI and state management via Zustand stores
- Rust backend handles: audio playback (Rodio), prayer time calculations (Salah lib), JAKIM API integration, task scheduling, system-level settings
- Communication between frontend and backend via Tauri IPC commands (`invoke()`) and events (`app.emit()` / `listen()`)
- Prayer times: JAKIM API for Malaysia, Salah library fallback for global locations
- Tauri plugins: autostart, geolocation, notification, store, positioner, opener

### Reminder System Flow

1. Rust scheduler (1s tick) detects time match (random or custom times)
2. Emits `"reminder-trigger"` event to frontend, shows window
3. Frontend generates hadith/dua content via `triggerNewReminder()`
4. Sends OS notification (truncated body) as visual alert
5. Auto-opens modal with full content (macOS doesn't support notification click callbacks)

- Random mode: deterministic 3 times/day (08:00–21:00, 90-min gaps, date-seeded LCG)
- Custom mode: user-configured times via settings

### Prayer Time Behavior

- Prayer time triggers notification + audio only (no window activation)
- Clicking the menu bar icon stops any playing Adhan audio (quick mute)
- Current prayer is highlighted green (derived from `nextPrayer` state, not timestamp comparison)
- Prayer tracker uses date-keyed records (`yyyy-MM-dd`) — auto-resets at midnight

### Islamic Key Dates

- Hijri date conversion via Tabular Islamic Calendar algorithm (`src/utils/HijriDate.ts`)
- Key dates are baked in as fixed Hijri month/day pairs (same every year)
- On-date displays: Israk & Mikraj (27 Rajab), Ramadhan (1 Ramadhan), Laylatul Qadr (nights 21/23/25/27/29 Ramadhan), Eid al-Fitr (1 Syawal), Day of Arafah (9 Dhul Hijjah), Eid al-Adha (10 Dhul Hijjah), Islamic New Year (1 Muharram), Mawlid Nabi (12 Rabi'ul Awal)
- Countdowns: Ramadhan (≤30 days before), Eid al-Fitr (≤15 days before)
- Up to 2 messages displayed simultaneously (stacked lines under countdown)

### App Controls

- Info button (bottom-right) shows quit menu; dismisses on click-outside or window blur
- `quit_app` Tauri command exits the app cleanly via `app.exit(0)`

## Coding Conventions

- TypeScript strict mode enabled
- Tailwind CSS with custom color variables and dark mode (class-based)
- Custom fonts: Outfit (sans), Buda, Saira
- Zustand stores follow pattern: state + actions in single store file
- Rust code uses standard Tauri command pattern with `#[tauri::command]`
- App identifier: `net.hafizhanif.sajda`

## Key Files

- `src/components/Dashboard.tsx` — Main UI component (settings, reminder modal, prayer list, key dates)
- `src/store/PrayerStore.ts` — Prayer times state management
- `src/store/ReminderStore.ts` — Reminder content generation (hadith/dua) and modal state
- `src/store/SettingsStore.ts` — Persisted user settings (audio, reminders, key dates, calculation method)
- `src/store/TrackerStore.ts` — Prayer habit tracker (date-keyed daily checkboxes)
- `src/utils/HijriDate.ts` — Hijri calendar conversion and Islamic key date detection
- `src-tauri/src/lib.rs` — App setup, tray icon handler, quit command, audio stop on click
- `src-tauri/src/prayer_engine.rs` — Prayer time calculation logic
- `src-tauri/src/jakim_api.rs` — Malaysian prayer times API
- `src-tauri/src/audio.rs` — Adhan audio playback
- `src-tauri/src/scheduler.rs` — Background task scheduling (prayer triggers, daily reminders)
- `src-tauri/src/settings.rs` — Rust-side settings deserialization
- `src-tauri/tauri.conf.json` — App window/bundle configuration
