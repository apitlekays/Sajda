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
  utils/                # Services (Audio, Location, Reminder, ZoneData)
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

## Coding Conventions

- TypeScript strict mode enabled
- Tailwind CSS with custom color variables and dark mode (class-based)
- Custom fonts: Outfit (sans), Buda, Saira
- Zustand stores follow pattern: state + actions in single store file
- Rust code uses standard Tauri command pattern with `#[tauri::command]`
- App identifier: `net.hafizhanif.sajda`

## Key Files

- `src/components/Dashboard.tsx` — Main UI component (settings, reminder modal, prayer list)
- `src/store/PrayerStore.ts` — Prayer times state management
- `src/store/ReminderStore.ts` — Reminder content generation (hadith/dua) and modal state
- `src/store/SettingsStore.ts` — Persisted user settings (audio, reminders, calculation method)
- `src-tauri/src/prayer_engine.rs` — Prayer time calculation logic
- `src-tauri/src/jakim_api.rs` — Malaysian prayer times API
- `src-tauri/src/audio.rs` — Adhan audio playback
- `src-tauri/src/scheduler.rs` — Background task scheduling (prayer triggers, daily reminders)
- `src-tauri/src/settings.rs` — Rust-side settings deserialization
- `src-tauri/tauri.conf.json` — App window/bundle configuration
