# CLAUDE.md

## Project Overview

Sajda is a macOS menu bar application for Islamic prayer times and reminders. Built with Tauri v2 (Rust backend) and React 19 + TypeScript (frontend).

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 7, Tailwind CSS 3, Zustand (state), Framer Motion
- **Backend:** Rust, Tauri v2, Tokio, Rodio (audio), Salah (prayer calculations), Swift (Core Location via swift-rs)
- **Platform:** macOS 10.15+ Catalina (menu bar app, 320x600px window, always-on-top)

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
  src/                  # Rust source (audio, jakim_api, location, prayer_engine, scheduler, settings)
  swift/SajdaLocation/  # Swift package for native macOS Core Location
  resources/audio/      # Adhan audio files
  tauri.conf.json       # Tauri app configuration
  Entitlements.plist    # macOS entitlements (location services)
  Info.plist            # macOS Info.plist with usage descriptions
public/                 # Static assets, fonts, icons
```

## Architecture

- Frontend handles UI and state management via Zustand stores
- Rust backend handles: audio playback (Rodio), prayer time calculations (Salah lib), JAKIM API integration, task scheduling, system-level settings
- Communication between frontend and backend via Tauri IPC commands (`invoke()`) and events (`app.emit()` / `listen()`)
- Prayer times: JAKIM API for Malaysia, Salah library fallback for global locations
- Tauri plugins: autostart, notification, store, positioner, opener

### Native Location (macOS Core Location)

Native GPS location is implemented via Swift FFI using the `swift-rs` crate. This provides accurate coordinates on macOS 10.15+.

**Architecture Flow:**
1. Frontend calls `LocationService.getNativeLocation()` via Tauri invoke
2. Rust `location.rs` calls Swift functions via FFI
3. Swift `SajdaLocation` package uses `CLLocationManager` to get GPS coordinates
4. Results are returned through the FFI chain back to frontend

**Authorization Flow:**
- On first run, app requests location authorization (shows system dialog)
- Authorization status: 0=authorized, 1=denied, 2=notDetermined, 3=restricted, 4=disabled
- If native location fails or is denied, falls back to IP geolocation (ipapi.co)

**Key Files:**
- `src-tauri/swift/SajdaLocation/` — Swift package with CLLocationManager wrapper
- `src-tauri/src/location.rs` — Rust FFI bindings and Tauri commands
- `src/utils/LocationService.ts` — Frontend service with native/IP fallback logic
- `src-tauri/Entitlements.plist` — Contains `com.apple.security.personal-information.location`
- `src-tauri/Info.plist` — Contains `NSLocationUsageDescription` keys

**Tauri Commands:**
- `get_native_location` — Get current GPS coordinates
- `check_native_location_auth` — Check authorization status
- `request_native_location_auth` — Request authorization (shows system dialog)
- `is_native_location_available` — Check if macOS 10.15+ (native location supported)
- `get_macos_version_cmd` — Get macOS version string

**Swift Runtime Compatibility:**
The app uses Swift FFI via `swift-rs` which links against Swift runtime libraries. To ensure compatibility with older macOS versions (10.15+), the CI workflow sets `MACOSX_DEPLOYMENT_TARGET=10.15`. This forces the linker to use absolute paths (`/usr/lib/swift/libswiftCore.dylib`) instead of `@rpath` references, which prevents "Library not loaded: @rpath/libswiftCore.dylib" crashes on older macOS versions.

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
- `src/store/UpdateStore.ts` — Auto-update state management (check, download, install)

### Utilities
- `src/utils/Analytics.ts` — PostHog analytics integration (opt-out, EU-hosted)
- `src/utils/HijriDate.ts` — Hijri calendar conversion and Islamic key date detection
- `src/utils/LocationService.ts` — Location detection (native GPS via Swift FFI, IP fallback via ipapi.co)
- `src/utils/MalayDictionary.ts` — Central dictionary for Malay language terms (prayer names, Hijri months, UI labels)
- `src/utils/UISounds.ts` — Web Audio API-based UI feedback sounds (toggle clicks, checkbox ticks)

### Rust Backend
- `src-tauri/src/lib.rs` — App setup, tray icon handler, quit command, audio stop on click
- `src-tauri/src/prayer_engine.rs` — Prayer time calculation logic
- `src-tauri/src/jakim_api.rs` — Malaysian prayer times API
- `src-tauri/src/audio.rs` — Adhan audio playback (graceful fallback when no audio device)
- `src-tauri/src/location.rs` — Native macOS Core Location via Swift FFI
- `src-tauri/src/scheduler.rs` — Background task scheduling (prayer triggers, daily reminders)
- `src-tauri/src/settings.rs` — Rust-side settings deserialization
- `src-tauri/tauri.conf.json` — App window/bundle configuration

### Swift Package
- `src-tauri/swift/SajdaLocation/Sources/SajdaLocation/SajdaLocation.swift` — CLLocationManager wrapper with FFI exports

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

## Auto-Update System

The app uses `@tauri-apps/plugin-updater` to check for and install updates from GitHub releases.

### Update Checking
- **Initial check:** 5 seconds after app launch (to not block initial render)
- **Periodic check:** Every 6 hours while the app is running
- Update checks are silent — errors are logged but not shown to users

### Update Endpoint
Configured in `tauri.conf.json` under `plugins.updater.endpoints`:
```
https://github.com/apitlekays/Sajda/releases/latest/download/latest.json
```

### Key Files
- `src/store/UpdateStore.ts` — State management for update checking and installation
- `src/components/Dashboard.tsx` — Periodic update check logic (useEffect with interval)

## Release Workflow

Releases are built automatically via GitHub Actions, but require **manual publishing** as the final step.

### Complete Release Process (Step-by-Step)

#### Step 1: Bump Version
Update version in **all 3 files** (must match exactly):
- `package.json` — `"version": "X.Y.Z"`
- `src-tauri/tauri.conf.json` — `"version": "X.Y.Z"`
- `src-tauri/Cargo.toml` — `version = "X.Y.Z"`

#### Step 2: Commit and Push
```bash
git add -A && git commit -m "feat: <description> (vX.Y.Z)"
git push origin main
```

#### Step 3: Create and Push Tag
This triggers the GitHub Actions workflow:
```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

#### Step 4: Monitor Workflow
- Go to [GitHub Actions](https://github.com/apitlekays/Sajda/actions)
- Watch the "Release" workflow run
- Wait for all jobs to complete (typically 10-15 minutes):
  - `release (aarch64)` — Apple Silicon build
  - `release (x64)` — Intel build
  - `publish-updater` — Generates `latest.json`

#### Step 5: Publish the Release (MANUAL - REQUIRED!)
**IMPORTANT:** The workflow creates a **DRAFT** release. Auto-updates will NOT work until you publish it!

1. Go to [GitHub Releases](https://github.com/apitlekays/Sajda/releases)
2. Find the draft release (labeled "Draft" with version vX.Y.Z)
3. Verify all 7 assets are present (see list below)
4. Click **"Edit"** (pencil icon)
5. Click **"Publish release"** (green button at bottom)

#### Step 6: Verify Auto-Update Endpoint
After publishing, verify the update endpoint works:
```bash
curl -sL https://github.com/apitlekays/Sajda/releases/latest/download/latest.json
```
Should return JSON with version, non-empty signatures, and download URLs.

### What GitHub Actions Does Automatically

The `.github/workflows/release.yml` workflow:
1. Builds for both architectures (aarch64 + x86_64)
2. Code-signs with Developer ID certificate
3. Notarizes with Apple
4. Uploads DMG and `.app.tar.gz` files to **draft** release
5. Signs the `.tar.gz` files using `tauri signer sign` CLI
6. Uploads signature files (`.sig`) for each architecture
7. Generates and uploads `latest.json` with signatures

### Release Assets (All 7 Required)

After workflow completes, the draft release should contain:
| Asset | Description |
|-------|-------------|
| `Sajda_X.Y.Z_aarch64.dmg` | Apple Silicon installer |
| `Sajda_X.Y.Z_x64.dmg` | Intel installer |
| `Sajda_aarch64.app.tar.gz` | Apple Silicon update bundle |
| `Sajda_x64.app.tar.gz` | Intel update bundle |
| `Sajda_aarch64.app.tar.gz.sig` | Apple Silicon signature |
| `Sajda_x64.app.tar.gz.sig` | Intel signature |
| `latest.json` | Update manifest (required for auto-updates) |

**If any asset is missing, the workflow failed and needs investigation.**

### Troubleshooting

**Workflow failed?**
- Check the failed step in GitHub Actions logs
- Common issues: signing key problems, notarization failures, network timeouts

**Auto-update not working after publish?**
- Verify `latest.json` exists and has non-empty `signature` fields
- Check that the release is published (not draft)
- The updater endpoint points to `/releases/latest/download/latest.json`

### Source Maps (PostHog)

For readable error stack traces in PostHog, upload source maps after building:
```bash
npm run build
npm run sourcemap:release
```

**Note:** This is optional but recommended for debugging production errors.

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
