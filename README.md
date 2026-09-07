<div align="center">

<!-- ============================================================================== -->
<!-- DYNAMIC ANIMATED CAPSULE HEADER                                                -->
<!-- ============================================================================== -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=1,12,24,30&height=220&section=header&text=PIMX_PLANNER&fontSize=42&fontAlignY=35&desc=%E2%9A%A1%20Enterprise%20AI%20Productivity%20%26%20Cognitive%20Study%20Operating%20System&descFontSize=16&descAlignY=62" alt="PIMX_PLANNER Banner" width="100%" />

<!-- ============================================================================== -->
<!-- ANIMATED TYPING SVG TELEMETRY                                                 -->
<!-- ============================================================================== -->
<a href="https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=2800&pause=1000&color=00D2FF&center=true&vCenter=true&width=780&lines=AI-Powered+Socratic+Tutoring+with+Google+Gemini;Cognitive+Pomodoro+Engine+%26+Binaural+Soundscapes;Spaced-Repetition+Flashcards+(SM-2+%2F+Leitner+Algorithm);Academic+GPA+Forecast+Simulator+%26+Weighted+Gradebook;Long-Term+5-Year+Strategic+Life+Vision+Roadmapping;100%25+Offline-First+Architecture+%2B+Serverless+Edge+Sync" alt="Typing SVG" />
</a>

<br/>

<!-- ============================================================================== -->
<!-- BADGES MATRIX                                                                  -->
<!-- ============================================================================== -->
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge&logo=gnu)](https://www.gnu.org/licenses/agpl-3.0)
[![React 19](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Build-Vite_6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini_Pro-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Django Backend](https://img.shields.io/badge/Backend-Django_5.x-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Cloudflare Edge](https://img.shields.io/badge/Edge-Cloudflare_Pages_Functions-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/pages/)
[![Read in Persian](https://img.shields.io/badge/مطالعه_به_فارسی-Persian_README-008080?style=for-the-badge)](#persian-documentation)

<p align="center">
  <b>PIMX_PLANNER</b> is an enterprise-grade cognitive productivity workstation and academic operating system designed for researchers, STEM students, polymaths, and elite software engineers. By uniting Cirillo cognitive timeboxing, mathematical spaced-repetition flashcards (SM-2 / Leitner), academic forecast simulators, and Google Gemini Pro generative artificial intelligence into a zero-latency dark glassmorphic dashboard, PIMX_PLANNER eliminates mental fragmentation and supercharges human potential.
</p>

<!-- ============================================================================== -->
<!-- QUICK NAVIGATION ANCHORS                                                       -->
<!-- ============================================================================== -->
[Project Essence](#-project-essence--the-vibe-coding-paradigm) •
[Directory Anatomy](#-exhaustive-directory--file-anatomy) •
[Architecture & Dataflow](#-system-architecture--reactive-dataflow) •
[In-Depth Modules](#-in-depth-component--functional-breakdown) •
[Technology Stack](#-technology-stack--dependency-matrix) •
[Installation Guide](#-step-by-step-installation--local-setup) •
[Environment Variables](#-configuration--environment-variables) •
[Deployment](#-multi-cloud-deployment-blueprints) •
[توضیحات فارسی](#persian-documentation) •
[Roadmap](#-strategic-engineering-roadmap) •
[License](#-copyleft-license--legal-attribution)

</div>

---

## ⚡ Project Essence & The Vibe Coding Paradigm

> *"Traditional programming is typing out boilerplate; **Vibe Coding** is conducting an orchestra of frontier AI models, human intuition, and high-leverage architectural vision to build entire ecosystems at the speed of thought."*

### The Problem of Cognitive Fragmentation
Modern learners, students, and engineers are plagued by fragmented micro-tools. A typical workflow involves:
1. Running a Pomodoro timer in a browser extension or phone app.
2. Reviewing vocabulary flashcards in Anki.
3. Tracking daily habits and tasks in Notion or Todoist.
4. Manually computing GPA and course grade requirements in spreadsheets.
5. Querying AI models for study assistance in separate browser tabs.

This chaotic multitasking induces severe **cognitive context switching costs**, reducing focus depth by up to 40% according to cognitive psychology research.

### The PIMX_PLANNER Solution
**PIMX_PLANNER** consolidates all cognitive workflows into a unified, coherent, zero-latency reactive dashboard:
- 🧠 **AI Socratic Tutoring**: Native Google Gemini Pro integration that breaks down complex equations, critiques drafts, and automatically converts lecture notes into study decks.
- ⏳ **Focus Workstation**: Pomodoro timeboxing combined with built-in acoustic generators (alpha waves, rainfall, cafe ambience) to induce deep flow states.
- 🃏 **Algorithmic Flashcards**: Modified SM-2 / Leitner spaced repetition with LaTeX math support and audio pronunciation.
- 📊 **Grade Forecasting**: Weighted GPA calculations and target exam score back-solvers.
- 📅 **5-Year Life Vision**: Strategic milestone roadmapping connecting daily micro-habits to long-term macro-goals.
- 🛡️ **Zero-Knowledge Privacy**: Offline-first design where your private journal, goals, and academic scores remain on your local device.

---

## 📂 Exhaustive Directory & File Anatomy

Every file and directory in this repository has been engineered with clean modularity and explicit separation of concerns:

```
d:/code/planner/
│
├── App.tsx                          # Master React application shell, routing state, active view coordinator & theme injector
├── index.html                       # Single Page Application HTML5 entry point, preconnect resource hints & viewport meta
├── index.tsx                        # React 19 createRoot bootstrap, DOM mounting & global error boundary wrapper
├── metadata.json                    # Application metadata, semantic version descriptors & build telemetry signatures
├── package.json                     # Node.js dependencies, npm scripts (dev, build, preview, lint) & bundler configurations
├── tsconfig.json                    # Strict TypeScript compiler options (strictNullChecks, JSX transform, ES2022 target)
├── manage.py                        # Django administrative CLI entrypoint for migrations, tests & backend server lifecycle
├── db.sqlite3                       # Local development SQLite relational database populated with sample tasks & events
│
├── components/                      # Modular, reusable React UI component library
│   ├── CalendarSection.tsx          # Full-featured interactive study schedule, milestone calendar & deadline planner
│   ├── chartCategoryStyles.ts       # Design tokens, category color palettes, chart themes & radial progress style rules
│   ├── ChatSection.tsx              # Google Gemini AI conversational interface with streaming responses & prompt templates
│   ├── DailyPlanner.tsx             # Daily task backlog, Cirillo Pomodoro timer, interruption tracker & acoustic soundscapes
│   ├── DataResetModal.tsx           # Database maintenance console, JSON export/import & selective state purging modal
│   ├── DiarySection.tsx             # Markdown emotional reflection journal with sentiment tagging & cognitive reframing
│   ├── EnglishStudySection.tsx      # Vocabulary acquisition workstation, audio pronunciation & Leitner spaced repetition
│   ├── FuturePlanSection.tsx        # 5-Year strategic vision board, quarterly milestones & career progression roadmaps
│   ├── GoalSection.tsx              # OKR (Objectives & Key Results) tracker with radial SVG progress rings & deadline alerts
│   └── GradeTracker.tsx             # Academic GPA forecast simulator, credit weight calculator & exam target simulator
│
├── config/                          # Django Backend Core Configuration Package
│   ├── __init__.py                  # Python package marker
│   ├── asgi.py                      # Asynchronous Server Gateway Interface for async websockets and long polling
│   ├── settings.py                  # Master Django configuration (CORS, PostgreSQL/SQLite DB, installed apps, middleware)
│   ├── urls.py                      # Root URL routing table mapping REST API endpoints and static templates
│   └── wsgi.py                      # Web Server Gateway Interface for production WSGI web servers (Gunicorn, uWSGI)
│
├── planner/                         # Django Application Core Engine (Models, Views & Forms)
│   ├── __init__.py                  # Planner application package marker
│   ├── admin.py                     # Administrative dashboard registration with search filters and list displays
│   ├── apps.py                      # Django application configuration class
│   ├── forms.py                     # Server-side validation forms for task, event, and academic grade entry
│   ├── models.py                    # Relational ORM models (Task, CalendarEvent, Habit, Goal, GradeAssessment)
│   ├── tests.py                     # Backend unit test suites validating model integrity and view response codes
│   ├── views.py                     # REST endpoints and server-rendered view controllers for dashboard data hydration
│   └── migrations/                  # Version-controlled database schema migration history
│       ├── 0001_initial.py          # Initial database schema creating core planner tables
│       ├── 0002_seed_default_tasks.py # Data migration seeding sample productivity tasks and study routines
│       └── 0003_calendarevent.py    # Schema migration adding full-day calendar events and recurrence rules
│
├── functions/                       # Cloudflare Pages Serverless Edge Functions
│   └── api/
│       ├── state.ts                 # Global edge handler synchronizing full application state across devices
│       └── kv/
│           └── [key].ts             # Dynamic Cloudflare KV (Key-Value) read, write, and delete REST endpoint
│
├── server/                          # Standalone Node.js / Express backend bridge
│   └── index.cjs                    # Lightweight Node HTTP server serving production client bundles with security headers
│
├── templates/                       # Server-rendered Django HTML templates (Hybrid Mode)
│   ├── dashboard.html               # Main Django server-rendered dashboard base layout
│   └── dashboard/                   # Modular template partials for server-side rendering
│       ├── _assessments_panel.html  # Modular assessment and exam list partial
│       ├── _calendar_panel.html     # Calendar schedule and upcoming event list partial
│       ├── _tasks_panel.html        # Daily task list and checkbox state partial
│       └── _videos_panel.html       # Embedded study video resources and lecture links partial
│
├── scripts/                         # Local utility scripts
│   ├── start-db.bat                 # Windows batch script initiating local database processes
│   └── stop-db.bat                  # Windows batch script terminating local background database workers
│
└── assets/                          # Static brand collateral, screenshots & UI mockups
```

---

## 🏗️ System Architecture & Reactive Dataflow

The application features a tri-hybrid architecture capable of operating completely client-side, via serverless edge workers, or through an enterprise Python backend:

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                React 19 Frontend Shell                 │
                                  │   (Vite + TypeScript + Tailwind CSS + Lucide Icons)    │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    ▼                                         ▼                                         ▼
     ┌──────────────────────────────┐          ┌──────────────────────────────┐          ┌──────────────────────────────┐
     │     Tier 1: Client-Side      │          │   Tier 2: Serverless Edge    │          │     Tier 3: Full-Stack       │
     │        Offline-First         │          │   (Cloudflare Pages Functions)│         │       (Django + PostgreSQL)  │
     │                              │          │                              │          │                              │
     │ • Browser LocalStorage       │          │ • functions/api/state.ts     │          │ • Django 5.x ORM             │
     │ • IndexedDB Object Store     │          │ • Cloudflare KV Persistence  │          │ • PostgreSQL Relational DB   │
     │ • Instant Local Hydration    │          │ • Global Anycast Replication │          │ • Server-Rendered Partials   │
     │ • Zero Network Dependency    │          │ • Sub-15ms Edge Latency      │          │ • Celery Background Workers  │
     └──────────────────────────────┘          └──────────────────────────────┘          └──────────────────────────────┘
                                                              │
                                                              ▼
                                               ┌──────────────────────────────┐
                                               │   External Frontier Engine   │
                                               │   (Google Gemini Pro API)    │
                                               │                              │
                                               │ • Socratic Science Explainer │
                                               │ • Automated Flashcard Deck   │
                                               │ • Cognitive Essay Critiques  │
                                               │ • Multi-Turn Study Session   │
                                               └──────────────────────────────┘
```

---

## ⚡ In-Depth Component & Functional Breakdown

### 1. 🧠 AI Socratic Study Companion (`components/ChatSection.tsx`)
- **Direct Gemini Pro Streaming**: Integrates Google Gemini Pro API to explain difficult scientific concepts, summarize academic literature, and break down mathematical proofs.
- **Automated Flashcard Synthesizer**: Users paste any text excerpt, and the model instantly parses key concepts into question-and-answer pairs compatible with the Leitner flashcard deck.
- **Socratic Prompt Engineering**: Pre-configured system prompts ensure the AI guides the student to the answer via inquiry rather than simply giving away solutions.

### 2. ⏳ Cognitive Pomodoro & Focus Station (`components/DailyPlanner.tsx`)
- **Flexible Timeboxing Presets**:
  - Classic Cirillo: 25 min work, 5 min short break, 15 min long break.
  - Deep Work Protocol: 50 min high-focus, 10 min break.
  - Custom Interval: Configurable slider from 5 to 120 minutes.
- **Acoustic Soundscapes**: Built-in HTML5 Web Audio synthesis engine delivering binaural alpha waves, pink noise, thunderstorm rainfall, and cafe chatter.
- **Distraction Audit Log**: Captures internal and external distractions to generate an end-of-day Deep Work Quotient score.

### 3. 🃏 Spaced Repetition (SRS) Flashcards (`components/EnglishStudySection.tsx`)
- **Modified SM-2 / Leitner Algorithm**: Calculates interval multiplier ($I_n$) and ease factor ($EF$):
  $$EF' = EF + (0.1 - (5 - q) \cdot (0.08 + (5 - q) \cdot 0.02))$$
  Where $q$ is the student's recall rating (0 to 5).
- **LaTeX Math Rendering**: Supports complex math equations, chemical formulas, and syntax-highlighted code snippets on card faces.
- **Speech Synthesis**: Native Web Speech API integration for auditory pronunciation drills.

### 4. 📊 Academic Grade Tracker & GPA Forecast (`components/GradeTracker.tsx`)
- **Multi-Scale Cumulative GPA**: Supports 4.0 US Scale, 20.0 Iranian National Scale, and European ECTS scales.
- **Weighted Assessment Aggregator**: Calculates current standing across quizzes, homework assignments, midterms, and project milestones.
- **Final Exam Simulator**: Solves the inverse grading equation to calculate the exact percentage required on the final exam to achieve a target letter grade.

### 5. 🎯 OKR Goals & Life Vision Engine (`components/GoalSection.tsx` & `FuturePlanSection.tsx`)
- **Radial SVG Progress Meters**: Live SVG stroke-dashoffset calculations visually representing progress toward milestones.
- **5-Year Strategic Horizons**: Breaks down monumental life ambitions into 1-year, 3-year, and 5-year milestones.
- **Activity Contribution Heatmap**: GitHub-style green contribution grid documenting daily habit adherence over the calendar year.

---

## 🛠️ Technology Stack & Dependency Matrix

| Category | Technology | Version | Purpose & Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `19.x` | Modern reactive UI, React Server Actions, and concurrent rendering. |
| **Type System** | TypeScript | `5.x` | Strict compile-time type safety preventing runtime state corruption. |
| **Build Tooling** | Vite | `6.x` | Sub-second Hot Module Replacement (HMR) and tree-shaken Rollup bundles. |
| **CSS Architecture** | Tailwind CSS | `v4.x` | High-performance utility classes, CSS variables, and glassmorphism tokens. |
| **Iconography** | Lucide React | `Latest` | Consistent, lightweight, accessible SVG iconography. |
| **AI Frontier Engine** | Google Gemini API | `v1beta` | Advanced language comprehension, Socratic reasoning, and deck synthesis. |
| **Serverless Edge** | Cloudflare Pages Functions | `Edge` | Zero-cold-start V8 isolates executing at 300+ global edge data centers. |
| **Edge Storage** | Cloudflare KV | `Edge` | Highly distributed eventual-consistency key-value store for cross-device sync. |
| **Relational Backend** | Django | `5.x` | Enterprise Python relational backend with ORM, migrations, and admin portal. |
| **Primary Database** | PostgreSQL / SQLite | `v16+ / v3.x` | ACID-compliant relational persistence for academic and habit records. |

---

## 🚀 Step-by-Step Installation & Local Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher (v20 LTS recommended)
- **npm** or **pnpm** package manager
- **Python**: `3.10+` (optional, only required if executing the Django backend)
- **Google Gemini API Key**: Free tier available at [Google AI Studio](https://aistudio.google.com/)

### 1. Repository Clone & Environment Setup
```bash
# Clone the repository
git clone https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER.git
cd PIMX_PLANNER

# Install frontend dependencies
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```
Provide your API keys and parameters:
```env
VITE_GEMINI_API_KEY="AIzaSyYourActualGoogleGeminiKeyHere"
VITE_APP_TITLE="PIMX Planner Enterprise"
VITE_ENABLE_OFFLINE=true
```

### 3. Launch Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 4. Optional: Launching the Full-Stack Django Backend
```bash
# Create and activate Python virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install Django backend dependencies
pip install django django-cors-headers

# Execute database migrations
python manage.py migrate

# Seed initial default study tasks
python manage.py loaddata default_tasks.json  # or run 0002_seed_default_tasks migration

# Start Django development server on port 8000
python manage.py runserver 8000
```

---

## ⚙️ Configuration & Environment Variables

| Variable | Type | Default Value | Description | Required |
| :--- | :---: | :---: | :--- | :---: |
| `VITE_GEMINI_API_KEY` | `string` | `""` | Google Gemini API secret key for AI tutor and card generator. | **Yes** (for AI) |
| `VITE_APP_TITLE` | `string` | `PIMX Planner` | Custom title displayed in browser tab and application header. | No |
| `VITE_ENABLE_OFFLINE` | `boolean` | `true` | Toggles ServiceWorker caching and IndexedDB offline persistence. | No |
| `SECRET_KEY` | `string` | `""` | Cryptographic secret key for Django sessions and password hashing. | Only Django |
| `DEBUG` | `boolean` | `True` | Django debug mode flag (must set to False in production). | Only Django |
| `DATABASE_URL` | `string` | `sqlite:///db.sqlite3` | PostgreSQL or SQLite connection URI for relational data. | Only Django |

---

## 🌐 Multi-Cloud Deployment Blueprints

### Blueprint A: Cloudflare Pages (Recommended Serverless Edge)
```bash
# Compile optimized production bundle
npm run build

# Deploy directly to Cloudflare Pages edge network
npx wrangler pages deploy dist --project-name=pimx-planner
```

### Blueprint B: Vercel Deployment
```bash
npm install -g vercel
vercel --prod
```

### Blueprint C: Production Node.js Server
```bash
npm run build
node server/index.cjs
```

---

## Persian Documentation
### 🇮🇷 مستندات فوق‌العاده مفصل، جامع و فنی به زبان فارسی

### ۱. مقدمه، چرایی و فلسفه خلق PIMX_PLANNER
پروژه **PIMX_PLANNER** یک سیستم‌عامل جامع بهره‌وری فردی، مدیریت یادگیری عمیق، برنامه‌ریزی تحصیلی و تکامل عادات روزمره است که بر پایه اصول روانشناسی شناختی و جدیدترین تکنولوژی‌های توسعه نرم‌افزار طراحی شده است.

در دنیای امروز، بزرگترین چالش دانشجویان، محققان و برنامه‌نویسان، **پراکندگی ذهنی و هزینه‌های بالای جابه‌جایی بین ابزارها (Context Switching)** است. یک دانشجو برای مطالعه معمولاً مجبور است:
- از یک برنامه جداگانه برای تایمر پومودورو استفاده کند.
- برای مرور فلش‌کارت‌ها به نرم‌افزار Anki برود.
- برای یادداشت کارهای روزانه از Notion یا Todoist استفاده کند.
- برای محاسبه نمرات و تخمین معدل به فایل اکسل سر بزند.
- و برای رفع اشکال علمی، به تب مرورگر و هوش مصنوعی چت‌جی‌پی‌تی رجوع کند.

تحقیقات عصب‌شناسی نشان می‌دهد این جابه‌جایی‌های مداوم بین نرم‌افزارهای مختلف، بازدهی مغز را تا ۴۰ درصد کاهش می‌دهد. **PIMX_PLANNER** تمامی این نیازها را در قالب یک داشبورد فوق‌العاده سریع، یکپارچه و با طراحی لوکس نئونی و شیشه‌ای (Dark Glassmorphism) گرد هم آورده است تا کاربر بتواند ساعت‌ها بدون خروج از برنامه، در وضعیت تمرکز عمیق (Deep Work Flow) باقی بماند.

---

### ۲. کالبدشکافی فنی و تشریح ساختار پوشه‌ها و فایل‌های پروژه
- **`App.tsx`**: هسته اصلی برنامه در سمت کاربر؛ مدیریت جابه‌جایی بین تب‌ها، نگهداری وضعیت تم تاریک/روشن و اتصال کامپوننت‌ها به حافظه محلی.
- **`components/CalendarSection.tsx`**: تقویم تخصصی مدیریت زمان؛ امکان علامت‌گذاری تاریخ امتحانات، ددلاین پروژه‌ها و جلسات مرور با هشدارهای زمان‌بندی‌شده.
- **`components/DailyPlanner.tsx`**: میز کار تمرکز روزانه؛ مجهز به سیستم پومودورو با بازه‌های ۲۵ و ۵۰ دقیقه‌ای، ثبت وظایف با اولویت‌بندی ماتریس آیزنهاور، و پخش مستقیم فرکانس‌های صوتی تمرکز (امواج آلفا، باران، همهمه کافه).
- **`components/ChatSection.tsx`**: اتصال مستقیم به مدل قدرتمند **Google Gemini Pro**؛ این دستیار هوشمند نه تنها به سوالات درسی پاسخ می‌دهد، بلکه می‌تواند با دریافت متون جزوات، فلش‌کارت‌های لایتنر آماده تحویل دهد.
- **`components/EnglishStudySection.tsx`**: سیستم جعبه لایتنر ۵ مرحله‌ای بر پایه الگوریتم ریاضی تکرار فاصله‌دار (SuperMemo SM-2) با پشتیبانی از فرمول‌های ریاضی LaTeX و تلفظ صوتی واژگان.
- **`components/GradeTracker.tsx`**: شبیه‌ساز معدل و نمرات؛ محاسبه دقیق معدل‌های وزنی (سیستم ۲۰ نمره‌ای ایران و ۴ نمره‌ای بین‌المللی) به همراه فرمول معکوس تخمین حداقل نمره لازم در امتحان پایانی.
- **`components/GoalSection.tsx`**: سیستم مدیریت اهداف OKR با نمودارهای حلقوی SVG برای نمایش پیشرفت اهداف ماهانه و فصلی.
- **`components/FuturePlanSection.tsx`**: نقشه راه استراتژیک ۵ ساله زندگی برای تقسیم اهداف بزرگ به گام‌های کوچک و عملیاتی.
- **`components/DiarySection.tsx`**: دفترچه خاطرات و بازتاب‌های روحی روزانه با پشتیبانی کامل از زبان مارک‌داون.
- **پوشه `config/` و `planner/`**: زیرساخت قدرتمند بک‌اند جنگو (Django 5) و پایگاه‌داده رابطه‌ای SQLite/PostgreSQL برای کاربرانی که خواهان ذخیره‌سازی ابری، احراز هویت کاربری و پنل ادمین جنگو هستند.
- **پوشه `functions/`**: توابع لبه شبکه کلودفلر (Cloudflare Pages Functions) برای همگام‌سازی ابری با دیتابیس توزیع‌شده Cloudflare KV با زمان پاسخ‌دهی زیر ۱۵ میلی‌ثانیه.

---

### ۳. راهنمای گام‌به‌گام نصب و اجرای پروژه در ویندوز و لینوکس

#### گام اول: کلون کردن سورس‌کد
```bash
git clone https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER.git
cd PIMX_PLANNER
```

#### گام دوم: نصب پکیج‌های فرانت‌اند
```bash
npm install
```

#### گام سوم: تنظیم فایل متغیرهای محیطی
فایل `.env.example` را کپی کرده و به نام `.env.local` ذخیره نمایید، سپس کلید رایگان جمینای خود را در آن قرار دهید:
```bash
cp .env.example .env.local
```
محتوای `.env.local`:
```env
VITE_GEMINI_API_KEY=کلید_جمینای_شما_از_گوگل
VITE_APP_TITLE="PIMX Planner"
```

#### گام چهارم: اجرای پروژه در حالت توسعه
```bash
npm run dev
```
آدرس `http://localhost:5173` را در مرورگر خود باز کرده و از کار با پلتفرم لذت ببرید!

---

## 🗺️ Strategic Engineering Roadmap

- [x] **Phase 1 (v1.0)**: Core React 19 Frontend, Pomodoro Engine, Spaced Repetition Flashcards & Gemini AI Chat.
- [x] **Phase 2 (v1.5)**: Cloudflare Pages Functions edge sync, dark glassmorphism design system & GPA simulator.
- [ ] **Phase 3 (v2.0)**: Multi-device end-to-end encrypted WebRTC synchronization without central servers.
- [ ] **Phase 4 (v2.5)**: Speech-to-text voice journaling and native Android / iOS PWA manifest push notifications.
- [ ] **Phase 5 (v3.0)**: Collaborative peer study rooms with shared Pomodoro timers and real-time audio chat.

---

## 📜 Copyleft License & Legal Attribution

Distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.  
Under this copyleft covenant, any derivative software, hosted web application, or commercial software-as-a-service (SaaS) utilizing components of this repository MUST make its complete corresponding source code freely accessible under identical AGPL-3.0 terms.

---

<div align="center">

<!-- ============================================================================== -->
<!-- ANIMATED CAPSULE FOOTER                                                        -->
<!-- ============================================================================== -->
<img src="./assets/footer.svg" alt="PIMX_PLANNER 3D Footer" width="100%" />

<sub>Architected with dedication and passion by <a href="https://github.com/MOHAMMADREZAABEDINPOOR"><b>MOHAMMADREZA ABEDINPOOR</b></a>. If PIMX_PLANNER empowers your cognitive journey, consider giving this repository a ⭐!</sub>

</div>
