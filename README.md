# 🎵 NhacCuaTui — Modern Vietnamese Music App

A premium music streaming platform inspired by **NhacCuaTui**, built with **React Native (Expo)** and a **Node.js/Express + MongoDB** backend. This project features a full migraton from Firebase to a custom **JWT-based Authentication** system and integrates **AI recommendations** via HuggingFace.

> [!NOTE]
> This project has been significantly refactored to support a large scale library (~270 pre-seeded songs) and AI-driven user experiences.

---

## ✨ Features

### 👤 User Experience
- **🎧 Seamless Streaming**: High-quality MP3 playback with a persistent Glassmorphic Mini Player.
- **🤖 AI Recommendations**: Personalized song suggestions powered by **HuggingFace Mistral-7B**, analyzing user history and favourites.
- **🔍 Smart Search**: Vietnamese-optimized search with genre filters (Bolero, Nhạc Trẻ, Trữ Tình, Rap Việt, etc.).
- **🔐 Secure Authentication**: Custom JWT system supporting Signup, Login, and real-time Profile Management.
- **❤️ Personal Library**: Manage Favorites, Playlists, and view detailed Listening History.
- **👤 Profile Management**: Edit personal info and update passwords with secure bcrypt hashing.

### 🛡️ Admin Controls
- **👥 User Management**: Full control over user accounts, including role updates (Member/Admin) and account deletion.
- **📊 System Stats**: Real-time overview of the music catalog and user base.

---

## 🚀 Tech Stack

- **Mobile**: React Native (Expo SDK 54), Expo Router, Reanimated 3 (Fluid Animations), Expo Blur (Glassmorphism).
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT.
- **AI**: HuggingFace Inference API (Mistral-7B-Instruct).
- **Storage**: Static asset serving for MP3s and high-res imagery.

---

## 📁 Project Structure

```
music-app/
├── server/                 # Express + Node.js Backend
│   ├── models/             # Mongoose Schemas (User, Song, Artist, Album, Playlist, History)
│   ├── routes/             # REST API Endpoints (Auth, Recommendations, Songs, etc.)
│   ├── src/middleware/     # JWT Auth & RBAC Authorization
│   ├── scripts/            # Database Seeding Utility (270+ NhacCuaTui songs)
│   └── public/             # Static Assets (MP3, Song/Album/Artist Images)
│
└── mobile/                 # React Native Mobile App
    ├── app/                # Expo Router Screens (Tabs, Player, Profile, Search)
    ├── components/         # Premium UI Components (Glassmorphism, Reanimated Cards)
    ├── context/            # Auth & Multi-track Player Logic
    ├── services/           # Axios-based API Layer
    └── constants/          # Spotify-inspired Design System (Colors, Spacing, Typography)
```

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- **Node.js 18+**
- **MongoDB** (Local instance or Atlas)
- **HuggingFace API Key** (For AI Recommendations)

### 2. Backend Configuration
1. Navigate to the server folder: `cd server`
2. Install dependencies: `npm install`
3. Configure `.env`:
   ```env
   PORT=4000
   DB_STRING=mongodb://localhost:27017/musicapp
   JWT_SECRET=your_jwt_secret_here
   HF_API_KEY=your_huggingface_key_here
   ```
4. **Seed the Music Library**:
   ```bash
   node scripts/seedNhacCuaTui.js  # Seeds original 17 songs
   node scripts/seedExtra.js       # Seeds 250+ Bolero & V-Pop songs
   ```
5. Start the server: `npm run dev`

### 3. Mobile Configuration
1. Navigate to the mobile folder: `cd mobile`
2. Install dependencies: `npm install`
3. Update API IP: Open `mobile/services/api.ts` and update `API_BASE` to your local machine's IP (e.g., `http://192.168.1.xxx:4000/api`).
4. Start Expo: `npx expo start`

---

## 🎨 Design System
- **Theme**: Premium Dark Mode (#0A0A0A base, #1DB954 primary).
- **Aesthetics**: Glassmorphism, subtle gradients, and spring-based animations.
- **Typography**: Modern sans-serif hierarchy (Inter/Roboto inspired).

---

## 📝 License
This project is for educational and portfolio purposes. Base backend inspired by Matin Imam.
# Music-App-
