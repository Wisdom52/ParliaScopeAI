# ParliaScope Project Startup Guide

This project is divided into three main components: **Backend**, **Web**, and **Mobile**.

## Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Expo CLI** (for mobile)
- **PostgreSQL** (with pgvector extension)

---

## 🚀 Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 🌐 Web Setup
1. Navigate to the web directory:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## 📱 Mobile Setup
1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Expo:
   ```bash
   npx expo start --clear
   ```

---

## 📝 Notes
- Ensure the backend is running before starting the Web or Mobile apps to allow data fetching to work correctly.
- The `mobile/config/api.ts` automatically detects the backend IP for Expo Go.
