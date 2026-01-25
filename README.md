<div align="center">
  <img src="public/128x128@2x.png" alt="Sajda Logo" width="128" height="128" />
  <h1>Sajda</h1>
  <p><strong>Modern Islamic Prayer Times & Reminder App for macOS</strong></p>

  [![Tauri](https://img.shields.io/badge/Tauri-v2-FEC00E?style=for-the-badge&logo=tauri&logoColor=black)](https://tauri.app)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
</div>

<br />

**Sajda** is a beautiful, unobtrusive menu bar application designed to keep you connected with your prayers. Built with the performance of Rust and the flexibility of React, it leverages the official JAKIM API for accurate Malaysian prayer times, optionally falling back to calculation methods for global support.

<div align="center">
  <img src="public/Sajda.png" alt="Sajda App Screenshot" width="500" />
</div>

## ✨ Features

### Prayer Times
- **Accurate Prayer Times** — Directly sourced from JAKIM (Malaysia) or calculated locally (Global).
- **Multiple Calculation Methods** — JAKIM, MUIS, MWL, ISNA, Umm Al-Qura, and more.
- **Native GPS Location** — Uses macOS Core Location (10.15+) via Swift FFI for precise coordinates.
- **Smart Fallback** — Falls back to IP geolocation if native location is unavailable or denied.
- **Location Toggle** — Enable/disable location services in settings with permission guidance.
- **Hijri Calendar** — Integrated Islamic calendar display with date header.

### Menu Bar
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
- **Version Display** — App version shown in footer, auto-synced from package.json.
- **Native Performance** — Built on Tauri v2 for an ultra-lightweight footprint (~5MB).

### Privacy & Setup
- **First-Run Setup** — Guided permission requests for notifications and location on first launch.
- **Opt-Out Analytics** — Anonymous usage analytics (PostHog EU) with easy toggle in settings.
- **Error Tracking** — Automatic crash reporting to help improve app stability.

## 🚀 Installation

Download the latest `.dmg` from [Releases](https://github.com/dochafiz/Sajda/releases) and drag the `.app` to your Applications folder.

> **Note:** Since the app is not code-signed, macOS may block it. Run this in Terminal after installing:
> ```bash
> xattr -cr /Applications/Sajda.app
> ```

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: Rust (Tauri v2), Tokio, Rodio (Audio), Swift (Core Location via swift-rs)
- **Data Source**: WaktuSolat.app API (JAKIM), Salah library (Global calculations)

## 🧪 Testing

| Suite | Tests | Status |
|-------|-------|--------|
| Frontend (Vitest) | 6 | ✅ |
| Backend (Cargo) | 25 | ✅ |
| **Total** | **31** | ✅ |

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

## 👤 Author

Developed with ❤️ by **Hafiz Hanif, PhD.**

## 📄 License

MIT
