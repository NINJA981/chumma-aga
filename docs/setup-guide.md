# VocalPulse - Complete Setup Guide

This guide covers setting up VocalPulse from scratch on Windows.

---

## 📋 Prerequisites

Before starting, ensure you have:

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **PostgreSQL** | 15+ | [postgresql.org](https://www.postgresql.org/download/windows/) |
| **Redis** | 7+ | [redis.io](https://redis.io/docs/install/) or use Docker |
| **Git** | Any | [git-scm.com](https://git-scm.com/) |

### Verify Installation
```powershell
node --version    # Should show v18+
npm --version     # Should show 9+
psql --version    # Should show 15+
```

---

## 🗄️ Step 1: Database Setup

### 1.1 Install PostgreSQL
Download and install from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)

During installation:
- Set a password for `postgres` user (remember this!)
- Keep default port: `5432`
- ✅ Select "pgAdmin 4" (GUI tool)

### 1.2 Create Database

**Option A: Using pgAdmin (GUI)**
1. Open pgAdmin 4
2. Connect to your local server
3. Right-click "Databases" → "Create" → "Database"
4. Name: `vocalpulse` → Save

**Option B: Using Command Line**
```powershell
# Open PowerShell as Administrator
psql -U postgres
# Enter your password when prompted

# In psql shell:
CREATE DATABASE vocalpulse;
\c vocalpulse
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

### 1.3 Run Schema

```powershell
cd C:\Users\Steve\Downloads\test\vocalpulse
psql -U postgres -d vocalpulse -f database\schema.sql
```

You should see output like:
```
CREATE TYPE
CREATE TABLE
CREATE INDEX
...
```

---

## 🔴 Step 2: Redis Setup

### Option A: Docker (Recommended)
```powershell
docker run -d --name vocalpulse-redis -p 6379:6379 redis:7-alpine
```

### Option B: Windows Native
1. Download from [github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)
2. Extract and run `redis-server.exe`

### Option C: Cloud (Upstash - Free)
1. Go to [upstash.com](https://upstash.com)
2. Create a free Redis database
3. Copy the connection URL

---

## ⚙️ Step 3: Backend Configuration

### 3.1 Create Environment File

```powershell
cd vocalpulse\backend
copy .env.example .env
```

### 3.2 Edit `.env` File

Open `backend\.env` in VS Code and update:

```env
# Server
PORT=3001
NODE_ENV=development

# Database (REQUIRED)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/vocalpulse

# Redis (REQUIRED)
REDIS_URL=redis://localhost:6379

# Authentication (REQUIRED - generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Twilio (OPTIONAL - for VoIP)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# OpenAI (OPTIONAL - for AI features)
OPENAI_API_KEY=

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 3.3 Generate JWT Secret

Run this in PowerShell to generate a secure secret:
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output to `JWT_SECRET` in your `.env` file.

---

## 📦 Step 4: Install Dependencies

### Option A: Use the install script
```powershell
cd C:\Users\Steve\Downloads\test\vocalpulse
.\install.bat
```

### Option B: Manual installation
```powershell
# Backend
cd vocalpulse\backend
npm install

# Web Dashboard
cd ..\web
npm install
```

---

## 🚀 Step 5: Run the Application

### Option A: Use the run script
```powershell
cd C:\Users\Steve\Downloads\test\vocalpulse
.\run.bat
```

### Option B: Manual start

**Terminal 1 - Backend:**
```powershell
cd vocalpulse\backend
npm run dev
```

**Terminal 2 - Web Dashboard:**
```powershell
cd vocalpulse\web
npm run dev
```

---

## ✅ Step 6: Verify Setup

### Check Backend Health
Open: http://localhost:3001/api/health

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-09T...",
  "services": {
    "database": true,
    "redis": true
  }
}
```

### Open Web Dashboard
Open: http://localhost:3000

You should see the login page!

---

## 👤 Step 7: Create First User

### Using the API (Postman/cURL)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "orgName": "My Company"
  }'
```

### Or Register via the Web UI
1. Go to http://localhost:3000/login
2. The login page will redirect to register for new users

---

## 🔧 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Ensure PostgreSQL is running
```powershell
# Check if PostgreSQL service is running
Get-Service -Name "postgresql*"

# Start if stopped
Start-Service -Name "postgresql-x64-15"
```

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution:** Start Redis
```powershell
# If using Docker
docker start vocalpulse-redis

# If using native
redis-server
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Solution:** Find and kill the process
```powershell
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Schema Error: uuid-ossp not found
```
ERROR: extension "uuid-ossp" is not available
```
**Solution:** Use pgcrypto instead
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```
Then change `uuid_generate_v4()` to `gen_random_uuid()` in schema.sql

---

## 📁 Project Structure

```
vocalpulse/
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── config/    # Database, Redis, Socket.io
│   │   ├── middleware/# Auth, leaderboard XP
│   │   ├── routes/    # API endpoints
│   │   └── services/  # AI services
│   └── .env           # Your config (create this!)
│
├── web/               # React + Vite Dashboard
│   └── src/
│       ├── pages/     # Dashboard, Leads, Leaderboard
│       ├── components/# Layout, charts
│       └── context/   # Auth, Socket providers
│
├── mobile/            # React Native App
│   └── src/
│       ├── screens/   # Login, Home, Leads
│       ├── components/# DispositionModal, Battlecard
│       └── services/  # GhostSync, API
│
├── database/          # PostgreSQL schema
├── docs/              # API documentation
├── install.bat        # Install dependencies
└── run.bat            # Start servers
```

---

## 🎉 Next Steps

1. **Create test leads** via CSV import or API
2. **Make some calls** to see the leaderboard update
3. **Add Twilio credentials** for VoIP (optional)
4. **Add OpenAI key** for AI features (optional)

---

## 🔗 Useful Links

| Resource | URL |
|----------|-----|
| API Docs | `docs/api-documentation.md` |
| AI Integration | `docs/ai-integration.md` |
| Mobile Guide | `docs/react-native-call-logs.md` |
| Backend Code | `backend/src/` |
| Web Dashboard | `web/src/` |
