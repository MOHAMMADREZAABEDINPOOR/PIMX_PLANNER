# راهنمای اجرای پروژه

## روش‌های مختلف اجرا

### 1. اجرای کامل با یک دستور (پیشنهادی)

```bash
npm run start:all
```

این دستور:
- دیتابیس PostgreSQL را روی پورت 5433 استارت می‌کنه
- 3 ثانیه صبر می‌کنه تا دیتابیس آماده بشه  
- API و Frontend رو همزمان اجرا می‌کنه

### 2. اجرای با فایل Batch (Windows)

```bash
start-project.bat
```

### 3. اجرای با PowerShell

```powershell
.\start-project.ps1
```

### 4. اجرای جداگانه (روش قدیمی)

```bash
# ابتدا دیتابیس
npm run start:db

# سپس API و Frontend
npm start
```

## دستورات مفید

- `npm start` - اجرای همزمان API و Frontend
- `npm run api` - فقط API
- `npm run dev` - فقط Frontend  
- `npm run start:db` - استارت دیتابیس
- `npm run stop:db` - متوقف کردن دیتابیس

## پورت‌ها

- API: http://localhost:4000
- Frontend: http://localhost:3000 (یا 3001 اگر 3000 درگیر باشه)
- Database: localhost:5433

## نکات

- اگر دیتابیس قبلاً اجرا شده، نیازی به استارت مجدد نیست
- برای متوقف کردن، Ctrl+C بزن
- اگر مشکلی پیش اومد، ابتدا دیتابیس رو چک کن