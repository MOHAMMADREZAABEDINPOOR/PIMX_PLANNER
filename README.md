# PIMX Planner 📚⚡

<p align="center">
  <a href="#english">
    <img alt="READ" src="https://img.shields.io/badge/READ-3b3f46?style=for-the-badge&labelColor=3b3f46&color=3b3f46" />
  </a>
  <a href="#persian-farsi">
    <img alt="PERSIAN DESCRIPTION" src="https://img.shields.io/badge/PERSIAN_DESCRIPTION-005ecb?style=for-the-badge&labelColor=005ecb&color=005ecb" />
  </a>
</p>

---

## English

### About The Project 🚀
PIMX Planner is an all-in-one study and productivity platform built for students, exam candidates, and focused self-learners.
Instead of jumping between multiple apps, you can run your full learning workflow in one place: planning, execution, tracking, and review.

The goal is simple: **turn daily effort into measurable progress**.
With structured modules and a clean interface, PIMX Planner helps you reduce mental clutter, stay consistent, and make better decisions based on your own performance data. 🔥

### Core Value 🎯
- Build strong daily discipline
- Make progress visible and measurable
- Convert long-term goals into executable daily actions
- Keep your data private, portable, and reliable

### Feature Breakdown ✨
- 🧠 **Daily Planning Engine**
  Create focused day plans, prioritize tasks, and keep execution tight.
- 📚 **Study Tracking by Subject**
  Log hours and activity by lesson/subject with historical visibility.
- 🇬🇧 **Dedicated English Study Mode**
  Separate English learning flow for better focus and dedicated analysis.
- 📈 **Progress Analytics**
  Visual insights, trend tracking, and performance patterns over time.
- 🎓 **Grade Management**
  Track grades and learning outcomes in one structured place.
- 📅 **Calendar & Timeline View**
  Organize schedule blocks and maintain continuity across days.
- 🎯 **Goal & Habit Layer**
  Define targets, monitor consistency, and prevent drift.
- 💬 **Notes / Chat-style Workspace**
  Quick idea capture, short reflections, and session notes.
- 🔐 **Login Gate**
  Private app access for personal use.
- ☁️ **Local-first + API Sync**
  Works with local storage and supports backend sync for persistence.

### Architecture Overview 🏗️
- **Frontend:** React + TypeScript + Vite
- **Backend API:** Express (`server/index.cjs`)
- **Database:** PostgreSQL (`JSONB` key-value style persistence)
- **Optional edge/API routes:** Cloudflare Functions
- **Storage strategy:** fast local UX + server sync for durability

### Project Structure 🧩
- `components/` UI and feature modules
- `App.tsx` app shell + routing/tab orchestration
- `utils.ts` shared utilities and storage helpers
- `types.ts` central data contracts and enums
- `server/index.cjs` Express API and DB operations
- `resetData.ts` scoped reset logic for sections

### Local Setup ▶️
```bash
npm install
npm run dev
npm run api
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000` (or your `VITE_API_BASE_URL`)

### Environment Notes ⚙️
Typical variables in `.env.local`:
- `VITE_API_BASE_URL=http://localhost:4000/api`
- `PG_CONNECTION_STRING=postgresql://user:password@localhost:5432/planner`
- `PGSSL=false`

### Troubleshooting 🩺
- If API calls fail, check `VITE_API_BASE_URL` and API port.
- If DB insert fails for JSON, ensure backend writes valid `JSONB` payloads.
- If local data seems stale, run a fresh reload and verify sync endpoints.

### Roadmap 🛣️
- Better reporting/export (weekly/monthly snapshots)
- Deeper analytics for subject-level productivity
- Smarter assistant actions around planning suggestions
- Improved mobile interaction patterns

### Repository 🔗
https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER

---

## Persian-Farsi

<p align="center">
  <a href="#english">
    <img alt="US" src="https://img.shields.io/badge/US-3b3f46?style=for-the-badge&labelColor=3b3f46&color=3b3f46" />
  </a>
  <a href="#english">
    <img alt="BACK TO ENGLISH" src="https://img.shields.io/badge/BACK_TO_ENGLISH-003f88?style=for-the-badge&labelColor=003f88&color=003f88" />
  </a>
</p>

### درباره پروژه 🚀
PIMX Planner یک پلتفرم کامل برای برنامه‌ریزی و مدیریت مطالعه است که مخصوص دانش‌آموزها، داوطلب‌ها و افراد هدف‌مند طراحی شده.
به‌جای استفاده از چند ابزار پراکنده، اینجا همه‌چیز در یک داشبورد یکپارچه قرار دارد: برنامه‌ریزی، اجرا، ثبت عملکرد و تحلیل پیشرفت.

هدف اصلی پروژه این است که **تلاش روزانه را به پیشرفت قابل اندازه‌گیری تبدیل کند**.
با ساختار ماژولار و رابط کاربری سریع، این پروژه کمک می‌کند تمرکزت بالا بماند، سردرگمی کمتر شود و تصمیم‌های دقیق‌تری برای مسیر یادگیری بگیری. 💯

### ارزش اصلی پروژه 🎯
- ساختن نظم روزانه واقعی
- قابل مشاهده‌کردن روند پیشرفت
- تبدیل هدف‌های بلندمدت به کارهای روزانه اجرایی
- نگهداری امن و پایدار داده‌های شخصی

### جزئیات قابلیت‌ها ✨
- 🧠 **برنامه‌ریز روزانه**
  طراحی برنامه قابل اجرا با تمرکز روی کارهای مهم.
- 📚 **ثبت مطالعه به تفکیک درس**
  مشاهده ساعات مطالعه هر درس در طول زمان.
- 🇬🇧 **بخش اختصاصی زبان انگلیسی**
  مسیر جدا برای مدیریت و تحلیل دقیق مطالعه زبان.
- 📈 **تحلیل و نمودار پیشرفت**
  دید واضح از روند عملکرد و الگوهای مطالعه.
- 🎓 **مدیریت نمرات**
  ثبت نمره‌ها و ارزیابی خروجی یادگیری.
- 📅 **تقویم و تایم‌لاین**
  مدیریت پیوستگی کارها و برنامه‌های روزانه/هفتگی.
- 🎯 **اهداف و عادت‌ها**
  پیگیری پایبندی و جلوگیری از افت برنامه.
- 💬 **فضای یادداشت/چت**
  ثبت سریع ایده‌ها، نکته‌ها و مرور روزانه.
- 🔐 **ورود امن**
  محافظت از دسترسی در استفاده شخصی.
- ☁️ **ذخیره‌سازی محلی + همگام‌سازی API**
  تجربه سریع در کلاینت با امکان پایداری سمت سرور.

### نمای معماری پروژه 🏗️
- **فرانت‌اند:** React + TypeScript + Vite
- **بک‌اند API:** Express (`server/index.cjs`)
- **دیتابیس:** PostgreSQL با `JSONB`
- **مسیرهای اختیاری:** Cloudflare Functions
- **الگوی ذخیره‌سازی:** Local-first + Sync

### ساختار پروژه 🧩
- `components/` ماژول‌های رابط کاربری
- `App.tsx` هسته اصلی نمایش بخش‌ها
- `utils.ts` ابزارهای مشترک و storage
- `types.ts` تایپ‌ها و قراردادهای داده
- `server/index.cjs` API و منطق دیتابیس
- `resetData.ts` ریست کنترل‌شده داده‌ها

### اجرای محلی ▶️
```bash
npm install
npm run dev
npm run api
```

- فرانت‌اند: `http://localhost:5173`
- API: `http://localhost:4000` (یا `VITE_API_BASE_URL`)

### تنظیمات محیطی ⚙️
نمونه متغیرهای `.env.local`:
- `VITE_API_BASE_URL=http://localhost:4000/api`
- `PG_CONNECTION_STRING=postgresql://user:password@localhost:5432/planner`
- `PGSSL=false`

### عیب‌یابی سریع 🩺
- اگر درخواست‌های API خطا داد، `VITE_API_BASE_URL` و پورت API را بررسی کن.
- اگر خطای JSON در DB دیدی، ورودی‌ها باید به JSON معتبر برای `JSONB` تبدیل شوند.
- اگر داده‌ها همگام نبودند، endpointهای sync و وضعیت سرور را چک کن.

### برنامه توسعه (Roadmap) 🛣️
- گزارش‌گیری بهتر هفتگی/ماهانه
- تحلیل عمیق‌تر بهره‌وری برای هر درس
- پیشنهادهای هوشمندتر برای برنامه‌ریزی
- بهبود تجربه کاربری موبایل

### مخزن گیت‌هاب 🔗
https://github.com/MOHAMMADREZAABEDINPOOR/PIMX_PLANNER