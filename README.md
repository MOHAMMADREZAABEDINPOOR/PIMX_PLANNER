<div align="center">

# 📚 PIMX_PLANNER ⚡🧠
### Comprehensive AI-Powered Productivity, Study Management & Habit Evolution Suite

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/agpl-3.0)
[![React: 19+](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Build-Vite_6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini_Pro-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Django Backend](https://img.shields.io/badge/Backend-Django_5.x-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Serverless-Cloudflare_Pages_Functions-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/pages/platform/functions/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Read in Persian](https://img.shields.io/badge/مطالعه_به_فارسی-Persian_README-008080?style=for-the-badge)](#-توضیحات-فوقالعاده-جامع-فارسی-persian-documentation)

<p align="center">
  A high-performance personal operating system engineered for students, researchers, polymaths, and developers. Unifies cognitive psychology routines, Pomodoro timeboxing, intelligent spaced-repetition flashcards (SRS), GPA & exam forecast calculators, long-term 5-year vision roadmaps, and Google Gemini AI tutoring into a unified, responsive glassmorphic dashboard.
</p>

[Project Overview](#-project-overview--problem-statement) •
[Directory Structure](#-directory--file-structure) •
[Architecture & Data Flow](#-system-architecture--data-flow) •
[Feature Deep Dive](#-comprehensive-feature-breakdown) •
[Tech Stack](#-technology-stack--dependencies) •
[Installation Guide](#-installation--local-development) •
[Environment Variables](#-configuration--environment-variables) •
[Deployment Guide](#-multi-target-deployment-guide) •
[توضیحات فارسی](#-توضیحات-فوقالعاده-جامع-فارسی-persian-documentation) •
[License](#-copyleft--licensing)

</div>

---

## 🎯 Project Overview & Problem Statement

Modern learners and developers struggle with fragmented productivity tools: Pomodoro timers in one app, flashcards in Anki, habit tracking in Notion, GPA calculations in spreadsheets, and AI tutoring in separate browser tabs. This constant context-switching degrades deep focus and causes cognitive overload.

**PIMX_PLANNER** resolves this fragmentation by establishing an all-in-one cognitive workspace:
1. **Zero Context Switching**: Every tool required for academic and personal growth lives in a unified, beautifully styled reactive interface.
2. **Hybrid Architecture**: Operates as a pure client-side SPA (Offline-First via LocalStorage/IndexedDB), a Serverless Edge WebApp (via Cloudflare Pages Functions & KV), or an Enterprise Full-Stack Django application backed by PostgreSQL.
3. **Integrated Generative AI**: Native integration with Google Gemini Pro API acting as a 24/7 personal tutor, summarizing textbooks, and creating quiz decks automatically.

---

## 📂 Directory & File Structure

Here is the exact structural breakdown of the repository and the architectural purpose of each module:

```
PIMX_PLANNER/
│
├── App.tsx                          # Root React application shell, navigation state & theme router
├── index.html                       # Single Page Application HTML5 entry point & viewport meta
├── index.tsx                        # React 19 DOM bootstrap & root mounting lifecycle
├── metadata.json                    # Application metadata, version descriptors & build telemetry
├── package.json                     # Node.js dependencies, scripts & bundler build parameters
├── tsconfig.json                    # TypeScript compiler options (strict typing, JSX, path aliases)
├── manage.py                        # Django CLI entrypoint for migrations, tests & backend server
│
├── components/                      # Reusable React UI component library
│   ├── CalendarSection.tsx          # Full-featured interactive study schedule & task calendar
│   ├── chartCategoryStyles.ts       # Color palettes, category tokens & chart design system
│   ├── ChatSection.tsx              # Google Gemini AI tutor conversational chat interface
│   ├── DailyPlanner.tsx             # Daily task backlog, Cirillo Pomodoro timer & soundscapes
│   ├── DataResetModal.tsx           # Database maintenance, state export/import & wipe modal
│   ├── DiarySection.tsx             # Emotional journal, markdown diary & cognitive reflection
│   ├── EnglishStudySection.tsx      # Vocabulary trainer, audio pronunciation & Leitner flashcards
│   ├── FuturePlanSection.tsx        # 5-Year strategic vision board & long-term milestones
│   ├── GoalSection.tsx              # OKR (Objectives & Key Results) tracker with progress rings
│   └── GradeTracker.tsx             # Academic GPA forecast calculator & grade weight simulator
│
├── config/                          # Django Backend Core Configuration
│   ├── asgi.py                      # Asynchronous Server Gateway Interface for async websockets
│   ├── settings.py                  # Django database configuration, CORS, middleware & auth
│   ├── urls.py                      # Root URL routing connecting API views and static templates
│   └── wsgi.py                      # Web Server Gateway Interface for traditional WSGI servers
│
├── planner/                         # Django Application Core (Models, Views & Forms)
│   ├── admin.py                     # Administrative dashboard registration for planner models
│   ├── forms.py                     # Server-side validation forms for task and goal entry
│   ├── models.py                    # PostgreSQL/SQLite relational schema (Task, Event, Goal)
│   ├── views.py                     # REST endpoints and server-rendered view controllers
│   └── migrations/                  # Database migration version files (0001, 0002, 0003)
│
├── functions/                       # Cloudflare Pages Serverless Edge Functions
│   └── api/
│       ├── state.ts                 # Edge endpoint for syncing full application state
│       └── kv/
│           └── [key].ts             # Dynamic Cloudflare KV key-value reader & writer
│
├── server/                          # Standalone Node.js / Express backend bridge
│   └── index.cjs                    # Lightweight Node HTTP server serving production build
│
├── templates/                       # Server-rendered Django HTML templates
│   ├── dashboard.html               # Main Django server-rendered dashboard wrapper
│   └── dashboard/
│       ├── _assessments_panel.html  # Modular assessment list template partial
│       ├── _calendar_panel.html     # Calendar view partial
│       ├── _tasks_panel.html        # Task manager partial
│       └── _videos_panel.html       # Study video resources partial
│
└── assets/                          # High-resolution screenshots, icons & brand vectors
```

---

## 🏗️ System Architecture & Data Flow

```
                                  ┌─────────────────────────────────────────┐
                                  │           React 19 Frontend Shell       │
                                  │   (Vite + TypeScript + Tailwind CSS)    │
                                  └────────────────────┬────────────────────┘
                                                       │
                      ┌────────────────────────────────┼────────────────────────────────┐
                      ▼                                ▼                                ▼
       ┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
       │     Offline-First Engine     │ │   Cloudflare Serverless Edge │ │    Django Full-Stack Hub     │
       │ - Browser LocalStorage       │ │ - functions/api/state.ts     │ │ - Django REST Controllers    │
       │ - IndexedDB Document Store   │ │ - Cloudflare KV Storage      │ │ - PostgreSQL / SQLite Rel    │
       │ - Instant State Hydration    │ │ - Low Latency Global Edge    │ │ - Celery Background Tasks    │
       └──────────────────────────────┘ └──────────────────────────────┘ └──────────────────────────────┘
                                                       │
                                                       ▼
                                        ┌──────────────────────────────┐
                                        │     Google Gemini AI Pro     │
                                        │ - Socratic Explanations      │
                                        │ - Auto-Flashcard Generation  │
                                        │ - Lecture Note Summaries     │
                                        └──────────────────────────────┘
```

---

## ⚡ Comprehensive Feature Breakdown

### 1. 🧠 AI Study Companion & Socratic Tutor (`ChatSection.tsx`)
- **Direct Gemini Pro Integration**: Answers complex STEM questions, breaks down multivariable calculus equations, and critiques academic essays.
- **Auto-Card Generation**: Paste an excerpt from a textbook, and the AI immediately synthesizes Leitner flashcards with terms on front and definitions on back.
- **Context Preservation**: Maintains multi-turn conversation memory within the local session.

### 2. ⏳ Cognitive Pomodoro & Focus Station (`DailyPlanner.tsx`)
- **Flexible Timeboxing**: Switch dynamically between Traditional Pomodoro (25/5 min), Extended Deep Work (50/10 min), or custom focus intervals.
- **Audio Soundscapes**: Built-in audio generators providing binaural alpha waves, gentle rainfall, coffee shop ambient bustle, and pink noise.
- **Interruption Diagnostics**: Tracks internal and external distraction triggers to give an end-of-day Deep Focus Rating.

### 3. 🃏 Intelligent Spaced Repetition (SRS) Flashcards (`EnglishStudySection.tsx`)
- **Modified SM-2 / Leitner Algorithm**: Cards migrate between 5 mastery boxes based on recall difficulty feedback (`Again`, `Hard`, `Good`, `Easy`).
- **Rich Media & LaTeX**: Full support for mathematical formulas via LaTeX syntax and code highlighting.
- **Audio Pronunciation**: Integrated speech synthesis for linguistic terms.

### 4. 📊 Academic Grade & Goal Forecasting (`GradeTracker.tsx` & `GoalSection.tsx`)
- **Weighted GPA Calculator**: Accurately aggregates course credit hours and percentage scores across customized grading scales.
- **Final Exam Simulator**: Back-solves for the exact score needed on final exams to achieve a target letter grade.
- **OKR Progress Rings**: Radial SVG gauges visualising overall progression toward quarterly and semester goals.

### 5. 📅 Life Vision & Strategic Roadmapping (`FuturePlanSection.tsx`)
- **5-Year Milestone Board**: Organizes ambitious life targets across 1-year, 3-year, and 5-year horizons.
- **Habit Consistency Heatmaps**: Visualizes consistency over months with GitHub-style green contribution tiles.

---

## 🛠️ Technology Stack & Dependencies

| Layer | Technology | Version | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `19.x` | Latest concurrent features, optimized reconciliation, and state actions. |
| **Language** | TypeScript | `5.x` | End-to-end type safety across components, props, and data models. |
| **Build Engine** | Vite | `6.x` | Instant Hot Module Replacement (HMR) and optimized Rollup bundles. |
| **Styling** | Tailwind CSS | `v4.x` | Modern utility classes, glassmorphism tokens, and dark theme support. |
| **AI Integration** | Google Gemini API | `v1beta` | Advanced language comprehension, Socratic reasoning, and summary generation. |
| **Backend Option A** | Django | `5.x` | Enterprise Python relational backend with ORM, migrations, and admin panel. |
| **Backend Option B** | Cloudflare Pages Functions | `Edge` | Serverless V8 isolates running directly on Cloudflare global edge network. |
| **Icons** | Lucide React | `Latest` | Consistent, accessible, and lightweight vector iconography. |

---

## 🚀 Installation & Local Development

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Python**: `3.10+` (optional, for Django backend)
- **Google Gemini API Key**: Obtainable for free at [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Setup Frontend
```bash
git clone https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER.git
cd PIMX_PLANNER

# Install frontend dependencies
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Edit `.env.local` and provide your configuration:
```env
VITE_GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
VITE_APP_TITLE="PIMX Planner"
```

### 3. Start Development Server
```bash
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

### 4. Running the Optional Django Backend
If you want to use the full Python relational database instead of client-side storage:
```bash
# Set up virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install Django dependencies
pip install django django-cors-headers

# Run database migrations
python manage.py migrate

# Start Django development server
python manage.py runserver 8000
```
Django API will be accessible at `http://localhost:8000`.

---

## ⚙️ Configuration & Environment Variables

| Variable | Type | Default | Description | Required |
| :--- | :---: | :---: | :--- | :---: |
| `VITE_GEMINI_API_KEY` | `string` | `""` | Google Gemini API secret key for AI tutor features. | **Yes** (for AI) |
| `VITE_APP_TITLE` | `string` | `PIMX Planner` | Custom title displayed in navigation header and page tab. | No |
| `VITE_ENABLE_OFFLINE` | `boolean` | `true` | Enables ServiceWorker and IndexedDB offline persistence. | No |
| `SECRET_KEY` | `string` | `""` | Django cryptographic secret key (used when running `manage.py`). | Only Django |
| `DATABASE_URL` | `string` | `sqlite:///db.sqlite3` | Database connection string for PostgreSQL or SQLite. | Only Django |

---

## 🌐 Multi-Target Deployment Guide

### Deploying to Cloudflare Pages (Recommended Serverless Edge)
```bash
npm run build
npx wrangler pages deploy dist --project-name=pimx-planner
```

### Deploying to Vercel
```bash
npm install -g vercel
vercel
```

### Running in Production via Node.js
```bash
npm run build
node server/index.cjs
```

---

## 🇮🇷 توضیحات فوق‌العاده جامع فارسی (Persian Documentation)

### ۱. معرفی پروژه و چرایی توسعه PIMX_PLANNER
پروژه **PIMX_PLANNER** یک پلتفرم جامع، مدرن و مبتنی بر هوش مصنوعی برای مدیریت مطالعه، ارتقای انضباط شخصی، برنامه‌ریزی درسی و رهگیری عادات روزانه است. بسیاری از دانشجویان، دانش‌آموزان و متخصصان برای کارهای روزمره خود مجبورند میان چندین نرم‌افزار مختلف جابه‌جا شوند: تایمر پومودورو در یک نرم‌افزار، جعبه لایتنر در انکی (Anki)، جدول اهداف در نوشن (Notion) و هوش مصنوعی در مرورگر. این پراکندگی تمرکز ذهن را برهم می‌زند.

پروژه **PIMX_PLANNER** تمامی این نیازها را در قالب یک داشبورد مدرن، شیک، با طراحی شیشه‌ای (Glassmorphism) و به صورت کاملاً هماهنگ گرد هم آورده است. این نرم‌افزار به صورت **Offline-First** عمل می‌کند؛ یعنی تمام اطلاعات در رایانه کاربر ذخیره شده و بدون اینترنت نیز تمامی بخش‌ها به جز چت با هوش مصنوعی کاملاً فعال هستند.

---

### ۲. تشریح ساختار فایل‌ها و کالبدشکافی کدها
- **`App.tsx`**: هسته اصلی مدیریت حالت‌های برنامه (State Management)، تعیین تب فعال و رندرسازی قالب کلی.
- **`components/CalendarSection.tsx`**: تقویم تعاملی برای زمان‌بندی جلسات مطالعه، آزمون‌ها و مرورهای درسی.
- **`components/DailyPlanner.tsx`**: میز کار روزانه شامل لیست وظایف (To-Do List)، تایمر تکنیک پومودورو (۲۵ و ۵۰ دقیقه‌ای) و پخش‌کننده صداهای پس‌زمینه (باران، کافه، امواج آلفا).
- **`components/ChatSection.tsx`**: رابط گفتگوی مستقیم با مدل هوش مصنوعی Gemini Pro برای رفع اشکال دروس، خلاصه‌سازی و ایجاد سوالات تستی.
- **`components/EnglishStudySection.tsx`**: سیستم فلش‌کارت و یادگیری لغات زبان بر پایه الگوریتم لایتنر و تکرار فاصله‌دار (Spaced Repetition).
- **`components/GradeTracker.tsx`**: ماشین‌حساب پیشرفته تخمین معدل (GPA) و شبیه‌ساز نمره مورد نیاز در امتحان پایانی.
- **`components/GoalSection.tsx`**: ثبت و رهگیری اهداف بلندمدت با حلقه‌های پیشرفت گرافیکی و سیستم OKR.
- **`components/FuturePlanSection.tsx`**: نقشه راه استراتژیک ۱، ۳ و ۵ ساله زندگی برای تفکر عمیق و آینده‌نگری.
- **`components/DiarySection.tsx`**: دفترچه خاطرات و بازتاب روحی-روانی روزانه با قابلیت یادداشت‌برداری مارک‌داون.
- **`manage.py` و پوشه `planner/`**: بک‌اند اختیاری جنگو (Django 5) برای کاربرانی که می‌خواهند از پایگاه‌داده رابطه‌ای PostgreSQL و پنل ادمین پایتون استفاده کنند.
- **پوشه `functions/`**: توابع بدون سرور (Serverless) کلودفلر برای همگام‌سازی ابری داده‌ها در حافظه سریع Cloudflare KV.

---

### ۳. راهنمای گام‌به‌گام نصب و راه‌اندازی در ویندوز و لینوکس

#### گام اول: دانلود سورس‌کد
```bash
git clone https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER.git
cd PIMX_PLANNER
```

#### گام دوم: نصب پیش‌نیازهای فرانت‌اند (Node.js)
```bash
npm install
```

#### گام سوم: تنظیم کلید هوش مصنوعی
فایل نمونه `.env.example` را با نام `.env.local` کپی کرده و کلید جمینای خود را وارد کنید:
```bash
cp .env.example .env.local
```
محتوای فایل `.env.local`:
```env
VITE_GEMINI_API_KEY=کلید_جمینای_شما
VITE_APP_TITLE="PIMX Planner"
```

#### گام چهارم: اجرای پروژه در محیط لوکال
```bash
npm run dev
```
سپس در مرورگر خود آدرس `http://localhost:5173` را باز کنید.

---

## 📜 Copyleft & Licensing

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.  
Under this copyleft license, any modifications, forks, or hosted network services (SaaS) must provide complete corresponding source code under the same AGPL-3.0 license terms.

---

<div align="center">
  <sub>Architected with passion by <a href="https://github.com/MOHAMMADREZAABEDINPOOR">MOHAMMADREZA ABEDINPOOR</a>. If this operating system powers your focus, give it a ⭐!</sub>
</div>
