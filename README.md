<div align="center">
  <img src="public/128x128@2x.png" alt="Sajda Logo" width="128" height="128" />
  <h1>Sajda</h1>
  <p><strong>Modern Islamic Prayer Times & Reminder App for macOS & Windows</strong></p>

  [![Tauri](https://img.shields.io/badge/Tauri-v2-FEC00E?style=for-the-badge&logo=tauri&logoColor=black)](https://tauri.app)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

---

## Overview

**Sajda** is a beautiful, unobtrusive menu bar/system tray application designed to keep you connected with your prayers. Built with the performance of Rust and the flexibility of React, it leverages the official JAKIM API for accurate Malaysian prayer times, optionally falling back to calculation methods for global support.

### Key Highlights

- 🕌 **Accurate Prayer Times** — JAKIM API + Global calculation methods
- 🔔 **Smart Notifications** — Adhan playback, chimes, or silent per prayer
- 📿 **Daily Reminders** — Hadith & Dua with beautiful full-content modals
- 📅 **Islamic Calendar** — Hijri dates with key Islamic date alerts
- 🌙 **Ramadhan Features** — Laylatul Qadr highlights, countdown timers
- ⚡ **Ultra-Lightweight** — Native performance with ~5MB footprint

<div align="center">
  <img src="public/Sajda.png" alt="Sajda App Screenshot" width="500" />
</div>

---

## ✨ Features

### Prayer Times
- **Accurate Prayer Times** — Directly sourced from JAKIM (Malaysia) or calculated locally (Global).
- **Multiple Calculation Methods** — JAKIM, MUIS, MWL, ISNA, Umm Al-Qura, and more.
- **Native GPS Location** — Uses platform-native location services (macOS Core Location, Windows Geolocation API) for precise coordinates.
- **Smart Fallback** — Falls back to IP geolocation if native location is unavailable or denied.
- **Location Toggle** — Enable/disable location services in settings with permission guidance.
- **Hijri Calendar** — Integrated Islamic calendar display with date header.

### Menu Bar / System Tray
- **Menu Bar Integration** — Discreetly lives in your menu bar with next prayer countdown.
- **Jumaat-Aware Labels** — Shows Malay prayer names with proper Friday labeling.
- **Quick Mute** — Click the menu bar icon to instantly stop a playing Adhan.

### Audio & Notifications
- **Audio Adhan** — Automated Adhan playback (Nasser, Ahmed) at prayer times.
- **Per-Prayer Audio Control** — Choose between Adhan, chime notification, or mute for each prayer.
- **Non-Intrusive Alerts** — Prayer notifications without stealing window focus.

### Reminders
- **Daily Reminders** — Hadith & Dua notifications with full-content modal.
- **Random Mode** — 3 reminders per day at randomized times (08:00–21:00).
- **Custom Schedule** — Configure your own reminder times.
- **Jumu'ah Reminder** — Surah Al-Kahf reading reminder every Friday at Zohor.

### Islamic Key Dates
- **Ramadhan Countdown** — Countdown starting 30 days before Ramadhan.
- **Eid al-Fitr Countdown** — Countdown starting 15 days before Eid.
- **Laylatul Qadr** — Highlights odd nights of the last 10 days of Ramadhan.
- **Key Date Alerts** — On-date display for Israk & Mikraj, Eid al-Adha, Day of Arafah, Islamic New Year, and Mawlid Nabi.

### Tracker & UI
- **Prayer Habit Tracker** — Daily checkbox tracker that resets at midnight.
- **Current Prayer Highlight** — Green highlight on the active prayer period.
- **Rich Dashboard** — Beautiful, glassmorphic UI with smooth animations.
- **Instant Responsiveness** — Skeleton loading for immediate app responsiveness on launch.
- **Version Display** — App version shown in footer, auto-synced from package.json.
- **Native Performance** — Built on Tauri v2 for an ultra-lightweight footprint (~5MB).

### Privacy & Setup
- **First-Run Setup** — Guided permission requests for notifications and location on first launch.
- **Opt-Out Analytics** — Anonymous usage analytics (PostHog EU) with easy toggle in settings.
- **Error Tracking** — Automatic crash reporting to help improve app stability.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Tauri v2](https://tauri.app) |
| **Frontend** | [React 19](https://react.dev), [TypeScript 5.8](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 7](https://vite.dev) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com), [Framer Motion](https://www.framer.com/motion/) |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs) |
| **Backend** | Rust, [Tokio](https://tokio.rs), [Rodio](https://docs.rs/rodio) (Audio) |
| **Prayer Calculations** | [Salah](https://crates.io/crates/salah) library |
| **macOS Location** | Swift FFI via [swift-rs](https://github.com/nicklockwood/swift-rs) (Core Location) |
| **Windows Location** | WinRT Geolocation API via [windows](https://crates.io/crates/windows) crate |
| **Data Source** | [WaktuSolat.app](https://api.waktusolat.app) API (JAKIM) |

### Architecture Principles

- **Non-blocking UI** — Heavy processing runs asynchronously in Rust
- **Platform-native** — Uses native APIs for location, notifications, and system tray
- **Instant startup** — Two-phase initialization with skeleton loading
- **Privacy-first** — All data stored locally, optional opt-out analytics

---

## 🚀 Installation

### macOS

Download the latest `.dmg` from [Releases](https://github.com/apitlekays/Sajda/releases):
- **Apple Silicon (M1/M2/M3/M4):** `Sajda_X.Y.Z_aarch64.dmg`
- **Intel:** `Sajda_X.Y.Z_x64.dmg`

Drag the `.app` to your Applications folder. The app is code-signed with a Developer ID certificate and supports automatic updates.

### Windows

Download the latest `.exe` installer from [Releases](https://github.com/apitlekays/Sajda/releases):
- **Windows 10/11 (64-bit):** `Sajda_X.Y.Z_x64-setup.exe`

Run the installer and follow the prompts. The app supports automatic updates.

<details>
<summary><strong>Windows SmartScreen Warning</strong></summary>

Since the Windows build is not code-signed, SmartScreen may show a warning on first run:

1. Click **"More info"**
2. Click **"Run anyway"**

This is normal for unsigned applications. The app is safe to use.
</details>

<details>
<summary><strong>Windows Location Services</strong></summary>

For accurate prayer times based on GPS location:

1. Open **Windows Settings**
2. Go to **Privacy & Security** > **Location**
3. Enable **Location services**
4. Ensure **Let apps access your location** is enabled

If location services are unavailable, the app automatically uses IP-based geolocation.
</details>

---

## 📁 Project Structure

```
sajda/
├── src/                        # React/TypeScript frontend
│   ├── components/            # UI components
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── Skeleton.tsx       # Loading skeletons
│   │   └── ErrorBoundary.tsx  # Error handling
│   ├── hooks/                 # Custom React hooks
│   ├── store/                 # Zustand stores
│   │   ├── PrayerStore.ts     # Prayer times state
│   │   ├── ReminderStore.ts   # Reminder content
│   │   ├── SettingsStore.ts   # User settings
│   │   └── TrackerStore.ts    # Prayer tracker
│   ├── utils/                 # Services & utilities
│   │   ├── LocationService.ts # GPS/IP location
│   │   ├── Platform.ts        # Platform detection
│   │   ├── HijriDate.ts       # Hijri calendar
│   │   └── Analytics.ts       # PostHog integration
│   └── data/                  # Static data (hadith, dua)
├── src-tauri/                  # Rust/Tauri backend
│   ├── src/
│   │   ├── lib.rs             # App setup, tray handler
│   │   ├── audio.rs           # Adhan playback
│   │   ├── location.rs        # Native location
│   │   ├── prayer_engine.rs   # Prayer calculations
│   │   └── scheduler.rs       # Background tasks
│   ├── swift/                 # macOS Swift FFI
│   ├── icons/                 # App icons
│   └── resources/audio/       # Adhan audio files
├── public/                     # Static assets
└── scripts/                    # Build scripts
```

---

## 🧪 Testing

| Suite | Tests | Status |
|-------|-------|--------|
| Frontend (Vitest) | 135 | ✅ |
| Backend (Cargo) | 30 | ✅ |
| **Total** | **165** | ✅ |

```bash
# Run frontend tests
npm test

# Run frontend tests in watch mode
npm run test:watch

# Run frontend tests with coverage
npm run test:coverage

# Run Rust backend tests
npm run test:rust

# Run all tests (frontend + backend)
npm run test:all
```

---

## 🗺️ Roadmap

### Completed
- [x] Core prayer times functionality
- [x] JAKIM API integration (Malaysia)
- [x] Global calculation methods
- [x] Native macOS location (Core Location)
- [x] Native Windows location (WinRT)
- [x] Audio Adhan with per-prayer control
- [x] Daily Hadith & Dua reminders
- [x] Islamic key date alerts
- [x] Prayer habit tracker
- [x] Auto-update system
- [x] Cross-platform support (macOS + Windows)

### Planned
- [ ] Qibla compass
- [ ] Quran reader integration
- [ ] Widget support (macOS/Windows)
- [ ] Mobile companion app
- [ ] Cloud sync for settings

---

## 🔮 Sajda v2.0 — Coming Soon

<div align="center">

### ⏳ Launching In

<table>
<tr>
<td align="center">
<table cellspacing="0" cellpadding="0">
<tr>
<td style="background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); border-radius: 8px; padding: 0;">
<div style="background: #1a1a2e; border-radius: 8px 8px 0 0; padding: 8px 16px; border-bottom: 2px solid #0f0f1a;">
<span style="font-family: 'SF Mono', monospace; font-size: 32px; font-weight: bold; color: #fff;">4</span>
<span style="font-family: 'SF Mono', monospace; font-size: 32px; font-weight: bold; color: #fff;">5</span>
<span style="font-family: 'SF Mono', monospace; font-size: 32px; font-weight: bold; color: #fff;">6</span>
</div>
</td>
</tr>
</table>
<br>
<sub><strong>DAYS</strong></sub>
</td>
<td width="20"></td>
<td align="center">
<table cellspacing="0" cellpadding="0">
<tr>
<td style="background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); border-radius: 8px; padding: 0;">
<div style="background: #1a1a2e; border-radius: 8px 8px 0 0; padding: 8px 16px; border-bottom: 2px solid #0f0f1a;">
<span style="font-family: 'SF Mono', monospace; font-size: 32px; font-weight: bold; color: #fff;">0</span>
<span style="font-family: 'SF Mono', monospace; font-size: 32px; font-weight: bold; color: #fff;">0</span>
</div>
</td>
</tr>
</table>
<br>
<sub><strong>HOURS</strong></sub>
</td>
<td width="20"></td>
<td align="center">
<table cellspacing="0" cellpadding="0">
<tr>
<td style="background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); border-radius: 8px; padding: 0;">
<div style="background: #1a1a2e; border-radius: 8px 8px 0 0; padding: 8px 16px; border-bottom: 2px solid #0f0f1a;">
<span style="font-family: 'SF Mono', monospace; font-size: 32px; font-weight: bold; color: #fff;">0</span>
<span style="font-family: 'SF Mono', monospace; font-size: 32px; font-weight: bold; color: #fff;">0</span>
</div>
</td>
</tr>
</table>
<br>
<sub><strong>MINS</strong></sub>
</td>
<td width="20"></td>
<td align="center">
<table cellspacing="0" cellpadding="0">
<tr>
<td style="background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); border-radius: 8px; padding: 0;">
<div style="background: #1a1a2e; border-radius: 8px 8px 0 0; padding: 8px 16px; border-bottom: 2px solid #0f0f1a;">
<span style="font-family: 'SF Mono', monospace; font-size: 32px; font-weight: bold; color: #fff;">0</span>
<span style="font-family: 'SF Mono', monospace; font-size: 32px; font-weight: bold; color: #fff;">0</span>
</div>
</td>
</tr>
</table>
<br>
<sub><strong>SECS</strong></sub>
</td>
</tr>
</table>

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     ┌─────┐   ┌─────┐       ┌─────┐   ┌─────┐       ┌─────┐   ┌─────┐       ┌─────┐   ┌─────┐     ║
║     │  4  │   │  5  │   :   │  0  │   │  0  │   :   │  0  │   │  0  │   :   │  0  │   │  0  │     ║
║     │  ▀  │   │  ▀  │       │  ▀  │   │  ▀  │       │  ▀  │   │  ▀  │       │  ▀  │   │  ▀  │     ║
║     │  4  │   │  5  │       │  0  │   │  0  │       │  0  │   │  0  │       │  0  │   │  0  │     ║
║     └─────┘   └─────┘       └─────┘   └─────┘       └─────┘   └─────┘       └─────┘   └─────┘     ║
║       DAYS          :         HOURS         :         MINS          :         SECS              ║
║                                                               ║
║                      📅 April 30, 2026                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

**What's coming in v2.0:**
- 🧭 Qibla Compass with AR support
- 📖 Integrated Quran Reader
- 🔊 Additional Adhan voices
- 📱 iOS & Android companion apps
- ☁️ Cloud sync across devices

<br>

[![Join Waitlist](https://img.shields.io/badge/🔔_Join_Waitlist-7C3AED?style=for-the-badge&logoColor=white)](https://sajda.app/waitlist)

</div>

---

## 👤 Author

Developed with ❤️ by **Hafiz Hanif, PhD.**

---

## 🔗 Links

- **Website**: [sajda.app](https://sajda.app)
- **Releases**: [GitHub Releases](https://github.com/apitlekays/Sajda/releases)
- **Issues**: [Report a Bug](https://github.com/apitlekays/Sajda/issues)

---

## 📄 License

MIT
