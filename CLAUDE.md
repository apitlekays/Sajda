# CLAUDE.md

## Project Overview

Sajda is a macOS menu bar application for Islamic prayer times and reminders. Built with Tauri v2 (Rust backend) and React 19 + TypeScript (frontend).

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 7, Tailwind CSS 3, Zustand (state), Framer Motion
- **Backend:** Rust, Tauri v2, Tokio, Rodio (audio), Salah (prayer calculations)
- **Platform:** macOS (menu bar app, 320x600px window, always-on-top)

## Commands

**IMPORTANT:** Vite 7 requires Node.js 20.19+ or 22.12+. Before running any npm commands:
```bash
source ~/.nvm/nvm.sh && nvm use 22.22.0
```

- `npm run dev` — Start Vite dev server (port 1420)
- `npm run build` — TypeScript check + Vite production build
- `npm run tauri dev` — Run full Tauri app in development
- `npm run tauri build` — Build production .app bundle
- `cargo build` — Build Rust backend (run from `src-tauri/`)
- `cargo check` — Type-check Rust code (run from `src-tauri/`)

### Testing

- `npm test` — Run frontend tests (Vitest)
- `npm run test:watch` — Run frontend tests in watch mode
- `npm run test:coverage` — Run frontend tests with coverage
- `npm run test:rust` — Run Rust backend tests
- `npm run test:all` — Run all tests (frontend + backend)

## Project Structure

```
src/                    # React/TypeScript frontend
  components/           # UI components (Dashboard.tsx, ErrorBoundary.tsx)
  store/                # Zustand stores (Prayer, Reminder, Settings, Tracker)
  utils/                # Services (Audio, Location, Reminder, ZoneData, HijriDate, UISounds, MalayDictionary)
  data/                 # Static data (reminders, dua.json, sahih_bukhari.json)
  test/                 # Test setup and fixtures
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
- Version display in footer uses `__APP_VERSION__` global constant (injected by Vite from package.json)

## Coding Conventions

- TypeScript strict mode enabled
- Tailwind CSS with custom color variables and dark mode (class-based)
- Custom fonts: Outfit (sans), Buda, Saira
- Zustand stores follow pattern: state + actions in single store file
- Rust code uses standard Tauri command pattern with `#[tauri::command]`
- App identifier: `net.hafizhanif.sajda`

### Malay Language Standards

All Malay language terms are centralized in `src/utils/MalayDictionary.ts` for consistency:
- Prayer names: Subuh, Syuruk, Zohor/Jumaat, Asar, Maghrib, Isyak
- Hijri months: Use Malaysian spelling (e.g., "Ramadhan" not "Ramadan", "Syawal" not "Shawwal")
- UI labels and notification messages use standard Bahasa Malaysia conventions

## Key Files

### Frontend Components
- `src/components/Dashboard.tsx` — Main UI component (settings, reminder modal, prayer list, key dates)
- `src/components/ErrorBoundary.tsx` — React error boundary for graceful error handling

### Stores
- `src/store/PrayerStore.ts` — Prayer times state management
- `src/store/ReminderStore.ts` — Reminder content generation (hadith/dua) and modal state
- `src/store/SettingsStore.ts` — Persisted user settings (audio, reminders, key dates, calculation method)
- `src/store/TrackerStore.ts` — Prayer habit tracker (date-keyed daily checkboxes)

### Utilities
- `src/utils/Analytics.ts` — PostHog analytics integration (opt-out, EU-hosted)
- `src/utils/HijriDate.ts` — Hijri calendar conversion and Islamic key date detection
- `src/utils/MalayDictionary.ts` — Central dictionary for Malay language terms (prayer names, Hijri months, UI labels)
- `src/utils/UISounds.ts` — Web Audio API-based UI feedback sounds (toggle clicks, checkbox ticks)

### Rust Backend
- `src-tauri/src/lib.rs` — App setup, tray icon handler, quit command, audio stop on click
- `src-tauri/src/prayer_engine.rs` — Prayer time calculation logic
- `src-tauri/src/jakim_api.rs` — Malaysian prayer times API
- `src-tauri/src/audio.rs` — Adhan audio playback (graceful fallback when no audio device)
- `src-tauri/src/scheduler.rs` — Background task scheduling (prayer triggers, daily reminders)
- `src-tauri/src/settings.rs` — Rust-side settings deserialization
- `src-tauri/tauri.conf.json` — App window/bundle configuration

## Analytics & Error Tracking

PostHog is used for analytics and error tracking (EU-hosted for GDPR compliance).

### Setup
- `PostHogProvider` wraps the app in `main.tsx` with `capture_exceptions: true`
- `PostHogErrorBoundary` in `ErrorBoundary.tsx` captures React render errors
- Global error handlers in `App.tsx` catch uncaught errors and unhandled rejections
- Manual `trackError()` calls in stores for caught exceptions

### Error Types in PostHog
| Error Type | Source | Description |
|------------|--------|-------------|
| `$exception` | PostHogErrorBoundary | React component crashes |
| `uncaught_error` | App.tsx global handler | Uncaught JS errors |
| `unhandled_rejection` | App.tsx global handler | Unhandled promise rejections |
| `settings_load` / `settings_save` | SettingsStore | Settings persistence failures |
| `tracker_load` / `tracker_save` | TrackerStore | Prayer tracker persistence failures |
| `location_detection` | PrayerStore | Zone detection failures |
| `prayer_fetch` | PrayerStore | Prayer times fetch failures |

### Telemetry
- Opt-out model: enabled by default, user can disable in settings
- `initAnalytics(telemetryEnabled)` respects user preference
- `setAnalyticsEnabled()` toggles capture on/off

## Release Workflow

**IMPORTANT:** Every release requires source map upload for readable error stack traces in PostHog.

### First-Time Setup
```bash
# Authenticate with PostHog CLI (EU region)
npx posthog-cli login --host https://eu.posthog.com
```

For CI/CD, set environment variables instead:
- `POSTHOG_CLI_HOST` = `https://eu.posthog.com`
- `POSTHOG_CLI_ENV_ID` = PostHog project ID
- `POSTHOG_CLI_TOKEN` = Personal API key with error tracking write permissions

### Release Steps
```bash
# 1. Bump version in package.json

# 2. Build frontend (generates source maps)
npm run build

# 3. Inject metadata + upload source maps to PostHog
npm run sourcemap:release

# 4. Build Tauri app (uses the injected dist/)
npm run tauri build
```

### Source Map Scripts
- `npm run sourcemap:inject` — Inject metadata into built files (uses package.json version)
- `npm run sourcemap:upload` — Upload source maps to PostHog EU
- `npm run sourcemap:release` — Both inject + upload

### Why Source Maps Matter
Each build produces unique minified code with different chunk hashes. Without uploading source maps for each release, PostHog will show minified stack traces like `index-abc123.js:1:2345` instead of readable locations like `Dashboard.tsx:142`.

## Versioning

**Format:** Semantic Versioning + commit ID: `vX.Y.Z (abcdef)`

### Version Locations
Version must be synchronized across these 3 files:
- `package.json` — `"version": "X.Y.Z"` (source of truth for frontend)
- `src-tauri/tauri.conf.json` — `"version": "X.Y.Z"` (Tauri app version)
- `src-tauri/Cargo.toml` — `version = "X.Y.Z"` (Rust crate version)

**Note:** Frontend components use `__APP_VERSION__` global constant injected by Vite from package.json at build time. No need to update UI code when bumping versions.

### Version Bump Rules
- **Patch (0.0.X):** Auto-bump on every README/CLAUDE.md update + git commit/push
- **Minor (0.X.0):** Only when explicitly requested (new features)
- **Major (X.0.0):** Only when explicitly requested (breaking changes)

### On Commit Workflow
When asked to "update readme, claude.md, and git commit/push":
1. Make documentation changes
2. Bump patch version in all 3 files
3. Stage and commit with message including version
4. Push to remote
