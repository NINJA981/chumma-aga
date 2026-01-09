# VocalPulse 🎙️

> **AI-Powered Dialer & Call Tracking System** - Eliminate the visibility black hole in sales with 100% transparency into call activity, quality, and performance analytics.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

![VocalPulse Banner](https://img.shields.io/badge/VocalPulse-AI%20Sales%20Intelligence-indigo)

## 🌟 Features

### Core Capabilities
- **🏢 Multi-Tenant Lead Management** - CSV upload with Round Robin & Weight-based assignment
- **📞 Smart Dialer** - VoIP via Twilio + SIM-based call tracking on mobile
- **📊 Real-Time Analytics** - Live dashboards with connectivity, talk time & heatmap analytics
- **🤖 AI Conversation Intelligence** - Auto-summarization, sentiment analysis & action item extraction

### AI-Powered Features
| Feature | Description | Technology |
|---------|-------------|------------|
| **Auto-Summarization** | 3-bullet point call summaries | OpenAI GPT-4o-mini |
| **Sentiment Analysis** | Customer temperament score (1-10) | NLP Processing |
| **Action Item Extraction** | Auto-detect follow-ups & create calendar entries | AI Pattern Recognition |
| **Transcription** | Real-time speech-to-text | Whisper API |

## 🏗️ Architecture

```
vocalpulse/
├── backend/           # Node.js + Express API server
├── web/               # React web dashboard
├── mobile/            # React Native app (SIM/VoIP)
├── database/          # PostgreSQL/SQLite schemas
├── docs/              # API & integration documentation
└── shared/            # Shared types & utilities
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend (Web)** | React 18 + Tailwind CSS | Manager dashboard & analytics |
| **Frontend (Mobile)** | React Native | SIM call tracking & dialer |
| **Backend** | Node.js + Express.js | REST API & WebSocket server |
| **Database** | PostgreSQL / SQLite | Relational data storage |
| **Cache** | Redis | Real-time leaderboard caching |
| **Telephony** | Twilio Voice SDK | VoIP calling capabilities |
| **AI** | OpenAI GPT-4o + Whisper | Conversation intelligence |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- SQLite3 (included) or PostgreSQL
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
git clone https://github.com/Kamesh-A13/chumma.git
cd vocalpulse

# Run the installer (Windows)
install.bat

# Or install manually
cd backend && npm install
cd ../web && npm install
```

### Configuration

1. Copy the environment template:
```bash
cd backend
cp .env.example .env
```

2. Configure your `.env` file:
```env
# Database
DATABASE_URL=sqlite:./vocalpulse.db
# Or for PostgreSQL:
# DATABASE_URL=postgres://user:password@localhost:5432/vocalpulse

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# JWT Secret
JWT_SECRET=your_jwt_secret_key
```

### Running the Application

```bash
# Using the run script (Windows)
run.bat

# Or run manually
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Web Dashboard
cd web && npm run dev
```

Access the application:
- **Web Dashboard**: http://localhost:5173
- **API Server**: http://localhost:3000

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [API Documentation](docs/api-documentation.md) | RESTful API endpoints & usage |
| [AI Integration Guide](docs/ai-integration.md) | OpenAI & Whisper setup |
| [React Native Call Logs](docs/react-native-call-logs.md) | Mobile call tracking implementation |
| [Setup Guide](docs/setup-guide.md) | Detailed installation instructions |

## 📊 Manager Dashboard Features

### Team Connectivity
- Real-time calls made vs. answered metrics
- Rep-by-rep performance comparison
- Daily/weekly/monthly trend analysis

### Talk Time Analytics
- Average duration per representative
- High-engager identification
- Call efficiency scoring

### Heatmaps
- Best time of day to call specific lead segments
- Geographic performance visualization
- Lead response optimization

## 🗄️ Database Schema

The system supports both PostgreSQL and SQLite. Key entities include:

- **Users** - Multi-tenant user management with roles
- **Leads** - Customer data with assignment tracking
- **Calls** - Call logs with duration, recordings & AI analysis
- **Teams** - Team structure & hierarchy
- **AI Insights** - Summaries, sentiments & action items

See [database/schema.sql](database/schema.sql) for the complete PostgreSQL schema.
See [database/schema-sqlite.sql](database/schema-sqlite.sql) for SQLite.

## 🎨 Design Language

VocalPulse uses a **"Clean Ed-Tech"** aesthetic:
- **Font**: Inter
- **Primary**: Indigo-600
- **Text**: Slate-900
- **Framework**: Tailwind CSS

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/login      - User login
POST /api/auth/register   - User registration
POST /api/auth/refresh    - Refresh token
```

### Leads
```
GET    /api/leads         - List leads (paginated)
POST   /api/leads         - Create lead
POST   /api/leads/upload  - CSV bulk upload
PUT    /api/leads/:id     - Update lead
DELETE /api/leads/:id     - Delete lead
```

### Calls
```
GET    /api/calls         - List calls
POST   /api/calls         - Log new call
GET    /api/calls/:id/ai  - Get AI insights
```

### Analytics
```
GET /api/analytics/team-connectivity  - Team performance
GET /api/analytics/talk-time          - Duration metrics
GET /api/analytics/heatmap            - Call timing analysis
GET /api/leaderboard                  - Real-time rankings
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Callyzer** - Inspiration for SIM-syncing capabilities
- **Gong.io** - Inspiration for AI revenue intelligence
- **Close.com** - Inspiration for live activity feeds
- **HubSpot** - Inspiration for sales dashboard design

---

<p align="center">
  Built with ❤️ for Sales Teams
</p>
