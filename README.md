<div align="center">

# 📚 PIMX_PLANNER ⚡🧠
### Enterprise AI-Powered Productivity, Study Management & Habit Evolution Suite

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/agpl-3.0)
[![React: 19+](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Build-Vite_6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini_Pro-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Read in Persian](https://img.shields.io/badge/مطالعه_به_فارسی-Persian_README-008080?style=for-the-badge)](#-توضیحات-کامل-فارسی-persian-documentation)

<p align="center">
  A state-of-the-art, high-performance personal operating system engineered for students, researchers, and professionals. Integrates cognitive psychology routines, Pomodoro timeboxing, intelligent spaced-repetition flashcards, GPA & exam forecast calculators, and Google Gemini AI tutoring into a unified, responsive glassmorphic dashboard.
</p>

[Key Modules](#-key-modules--capabilities) •
[System Architecture](#-system-architecture) •
[Quick Start](#-quick-start--installation) •
[Configuration](#-environment-variables) •
[توضیحات فارسی](#-توضیحات-کامل-فارسی-persian-documentation) •
[License](#-copyleft--license)

</div>

---

## 🚀 Key Modules & Capabilities

### 1. 🧠 AI Study Companion & Tutoring
- **Context-Aware Socratic Tutor**: Powered by the Google Gemini Pro API. Formulates explanatory guides, breaks down complex STEM formulas, and analyzes uploaded lecture notes.
- **Automated Summary Generator**: Instantly converts multi-paragraph study texts into concise executive bullet points and flashcard decks.

### 2. ⏳ Cognitive Pomodoro & Focus Engine
- **Customizable Intervals**: Configurable work, short break, and long break intervals adhering to the Cirillo timeboxing methodology.
- **Ambient Soundscapes**: Built-in background audio generators (binaural beats, white noise, rain, and lo-fi cafe ambiance) to maintain deep focus.
- **Interruption Log**: Tracks internal and external distractions to compute daily deep-work efficiency scores.

### 3. 🃏 Intelligent Spaced Repetition (SRS)
- **Leitner & SM-2 Algorithmic Flashcards**: Automates review intervals based on difficulty feedback (Again, Hard, Good, Easy).
- **Rich Media Cards**: Supports Markdown equations (LaTeX via KaTeX), code snippets with syntax highlighting, and visual diagrams.

### 4. 📊 Academic Grade & Goal Forecasting
- **Weighted GPA Calculator**: Computes cumulative GPA across varied grading scales (4.0 scale, ECTS, percentage systems).
- **Target Grade Simulator**: Back-calculates the minimum final exam score required to achieve desired course grades.

### 5. 📅 Habit Formation & Daily Routines
- **Visual Heatmaps**: GitHub-style activity contribution heatmaps for tracking habit consistency.
- **Streak Protection Engine**: Allows occasional rest days without breaking long-term motivation streaks.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (Vite + Tailwind CSS + Lucide Icons + Framer Motion) │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  State & Storage │        │ External APIs    │
    │  - LocalStorage  │        │ - Google Gemini  │
    │  - IndexedDB     │        │ - Cloud Analytics│
    │  - State Context │        │                  │
    └──────────────────┘        └──────────────────┘
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm** installed
- **Google Gemini API Key**: Obtainable free from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Install
```bash
git clone https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER.git
cd PIMX_PLANNER

# Install dependencies
npm install
```

### 2. Environment Configuration
Create a `.env` or `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
VITE_APP_TITLE="PIMX Planner Enterprise"
```

### 3. Launch Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## ⚙️ Environment Variables

| Variable | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `VITE_GEMINI_API_KEY` | `string` | `""` | Google Gemini API key used for tutoring and summary generation. |
| `VITE_APP_TITLE` | `string` | `PIMX Planner` | Name displayed in browser title bar and dashboard banner. |
| `VITE_ENABLE_ANALYTICS` | `boolean` | `false` | Enable privacy-respecting local analytics tracking. |

---

## 🇮🇷 توضیحات کامل فارسی (Persian Documentation)

### معرفی و چرایی ساخت پروژه PIMX_PLANNER
پروژه **PIMX_PLANNER** یک پلتفرم جامع، مدرن و مبتنی بر هوش مصنوعی برای مدیریت مطالعه، ارتقای انضباط شخصی، برنامه‌ریزی درسی و رهگیری عادات روزانه است. این پروژه با بهره‌گیری از اصول روانشناسی شناختی و تکنولوژی‌های روز وب (React 19 و TypeScript)، ابزارهای پراکنده مانند تایمر پومودورو، فلش‌کارت‌های تکرار فاصله‌دار، ماشین‌حساب تخمین معدل و دستیار هوشمند مطالعه را در قالب یک داشبورد یکپارچه و زیبا گرد هم آورده است.

### قابلیت‌ها و ویژگی‌های کلیدی:
1. **دستیار هوشمند با Google Gemini:**
   * پاسخ‌دهی مفهومی به سوالات علمی، حل گام‌به‌گام معادلات، و خلاصه‌سازی متون طولانی کتاب‌های درسی.
2. **سیستم پومودورو و صداهای پس‌زمینه (Focus Ambience):**
   * ایجاد بازه‌های زمانی ۲۵ و ۵۰ دقیقه‌ای تمرکز به همراه پخش مستقیم صداهای آرامش‌بخش (باران، صدای محیط کافه، فرکانس‌های صوتی تمرکز).
3. **فلش‌کارت با الگوریتم تکرار فاصله‌دار (Spaced Repetition):**
   * پیاده‌سازی متد لایتنر برای به‌خاطرسپاری دائمی مفاهیم در حافظه بلندمدت با زمان‌بندی هوشمند مرور.
4. **تخمین‌گر معدل (GPA Simulator):**
   * محاسبه دقیق نمره مورد نیاز در امتحانات پایان‌ترم برای کسب نمره یا معدل هدف با احتساب ضرایب دروس.
5. **رهگیر عادات با نمودار مشارکت (Activity Heatmap):**
   * نمایش روزانه و ماهانه وضعیت پایبندی به اهداف با انیمیشن‌های تعاملی مشابه گیت‌هاب.
6. **ذخیره‌سازی ایمن و محلی (Offline-First):**
   * تمامی اطلاعات به صورت محلی در حافظه مرورگر ذخیره شده و هیچ‌گونه دیتایی بدون اجازه کاربر به سرورها منتقل نمی‌شود.

### راهنمای نصب و راه‌اندازی در ویندوز و لینوکس:
```bash
# دریافت سورس کد
git clone https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER.git
cd PIMX_PLANNER

# نصب پکیج‌ها
npm install

# ساخت فایل تنظیمات و درج کلید جمینای
cp .env.example .env.local

# اجرای نسخه توسعه
npm run dev
```

---

## 📜 Copyleft & License

This project is open-source under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.  
Any public modifications, network hosting, or SaaS services based on this codebase must provide complete source code under the same AGPL-3.0 license.

---

<div align="center">
  <sub>Architected with dedication by <a href="https://github.com/MOHAMMADREZAABEDINPOOR">MOHAMMADREZA ABEDINPOOR</a>. If this helps your study workflow, leave a ⭐!</sub>
</div>
