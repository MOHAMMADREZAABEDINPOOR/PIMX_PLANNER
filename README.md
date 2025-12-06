# 🎯 AI-Powered Planning & Goal Tracking App

<div align="center">

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

**🚀 A modern, AI-powered planning application that helps you organize your life, track goals, and boost productivity!**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🤖 **AI-Powered Planning**
- Integrated with **Google Gemini AI** for intelligent task suggestions
- Smart scheduling and priority recommendations
- Natural language processing for easy task creation

### 📅 **Calendar Management**
- Interactive calendar view
- Drag-and-drop event scheduling
- Monthly, weekly, and daily views
- Event reminders and notifications

### 📝 **Daily Planner**
- Organize tasks by priority
- Time-blocking capabilities
- Daily progress tracking
- Quick task completion checkboxes

### 🎯 **Goal Tracking**
- Set and monitor long-term goals
- Break down goals into actionable tasks
- Progress visualization
- Milestone celebrations

### 📊 **Progress Visualization**
- Beautiful charts powered by Recharts
- Track productivity trends
- Analyze goal completion rates
- Export progress reports

### 🎓 **Grade Tracker**
- Track academic performance
- Calculate GPA automatically
- Course management
- Assignment deadlines

### 💬 **AI Chat Interface**
- Chat with Gemini AI for planning advice
- Get productivity tips
- Ask questions about your schedule
- Receive personalized recommendations

### 🎥 **Video Integration**
- Embed educational or motivational videos
- Create video playlists
- Track watched content

---

## 🎬 Demo

> 📸 Add screenshots or GIF demos of your application here!

---

## 🛠️ Tech Stack

### **Frontend**
- ⚛️ **React 19.2** - Modern UI library
- 📘 **TypeScript 5.8** - Type-safe development
- ⚡ **Vite 6.2** - Lightning-fast build tool
- 🎨 **Lucide React** - Beautiful icon library
- 📈 **Recharts 3.5.1** - Data visualization

### **Backend**
- 🖥️ **Express 4.22** - Node.js web framework
- 🔌 **CORS 2.8** - Cross-origin resource sharing
- 🤖 **@google/genai 1.30** - Gemini AI integration
- 🗄️ **PostgreSQL** - Robust database (pg 8.16)

---

## 📦 Installation

### **Prerequisites**

- **Node.js** (v20.0.0 or higher)
- **npm** or **yarn**
- **PostgreSQL** database
- **Google Gemini API Key** ([Get it here](https://makersuite.google.com/app/apikey))

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### **Step 2: Install Dependencies**

```bash
npm install
```

### **Step 3: Configure Environment Variables**

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/planning_app
```

### **Step 4: Set Up Database**

```bash
# Create PostgreSQL database
creatdb planning_app

# Run migrations (if applicable)
npm run migrate
```

---

## 🚀 Usage

### **Development Mode**

**Terminal 1** - Start Frontend:
```bash
npm run dev
```

**Terminal 2** - Start Backend:
```bash
npm run api
```

**Or use the convenient batch file:**
```bash
start-all.bat
```

The app will be available at:
- 🌐 Frontend: `http://localhost:5173`
- 🔌 Backend: `http://localhost:3000`

### **Production Build**

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
.
├── components/          # React components
│   ├── CalendarSection.tsx
│   ├── ChatSection.tsx
│   ├── DailyPlanner.tsx
│   ├── GoalSection.tsx
│   ├── GradeTracker.tsx
│   ├── ProgressSection.tsx
│   └── ...
├── server/             # Express backend
│   └── index.cjs
├── App.tsx             # Main app component
├── types.ts            # TypeScript definitions
├── utils.ts            # Utility functions
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies
```

---

## 🎨 Key Components

| Component | Description |
|-----------|-------------|
| 📅 `CalendarSection` | Interactive calendar with event management |
| 💬 `ChatSection` | AI-powered chat interface |
| 📝 `DailyPlanner` | Daily task organization |
| 🎯 `GoalSection` | Goal tracking and management |
| 🎓 `GradeTracker` | Academic performance tracking |
| 📊 `ProgressSection` | Visual progress analytics |
| 🎥 `VideoSection` | Video content integration |

---

## 🔒 Security

⚠️ **IMPORTANT**: Never commit your `.env.local` file!

- Keep your `GEMINI_API_KEY` secret
- Use environment variables for sensitive data
- Add `.env.local` to `.gitignore`

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. ✅ Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push to the branch (`git push origin feature/AmazingFeature`)
5. 🔀 Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- 🤖 Google Gemini AI for intelligent features
- ⚛️ React team for the amazing framework
- 📊 Recharts for beautiful visualizations
- 🎨 Lucide for elegant icons

---



<div align="center">

**⭐ Star this repo if you find it helpful! ⭐**

Made with ❤️ and ☕

</div>
