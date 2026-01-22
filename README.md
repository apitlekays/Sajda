<div align="center">
  <img src="public/mapimlogo.webp" alt="Sajda Logo" width="120" height="auto" />
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

## ✨ Features

- **Accurate Prayer Times**: Directly sourced from JAKIM (Malaysia) or calculated locally (Global).
- **Menu Bar Integration**: Discreetly lives in your menu bar with "Next Prayer" countdown.
- **Rich Dashboard**: Beautiful, glassmorphic UI via the system tray.
- **Audio Adhan**: Automated Adhan playback (Mishary, Nasser, Ahmed) for prayer times.
- **Daily Reminders**: Automated notification alerts for Zikr and Hadith.
- **Hijri Calendar**: Integrated Islamic calendar display.
- **Native Performance**: Built on Tauri v2 for an ultra-lightweight footprint (~5MB).
- **Auto-Location**: Automatically detects your zone for prayer times.

## 🚀 Installation

Drag the `.app` bundle to your Applications folder.

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: Rust (Tauri), Tokio, Rodio (Audio), Chrono
- **State Management**: Zustand
- **Data Source**: WaktuSolat.app API (JAKIM), Salah (Calculation)

## 📄 License

MIT
