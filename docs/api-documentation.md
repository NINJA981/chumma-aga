# VocalPulse API Documentation

## Base URL
```
Production: https://api.vocalpulse.io/api
Development: http://localhost:3001/api
```

## Authentication
All endpoints (except auth) require JWT Bearer token:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /auth/register
Create a new account.

**Request:**
```json
{
  "email": "john@company.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "orgName": "Acme Sales Inc"
}
```

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "john@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "rep",
    "orgId": "uuid"
  }
}
```

### POST /auth/login
```json
{ "email": "john@company.com", "password": "securepassword" }
```

### GET /auth/me
Get current authenticated user.

---

## Leads Endpoints

### GET /leads
List leads with pagination and filtering.

| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number (default: 1) |
| limit | int | Items per page (default: 50) |
| status | string | Filter by status (new, contacted, qualified, converted, lost) |
| search | string | Search by name, phone, company |

**Response:**
```json
{
  "leads": [...],
  "pagination": { "page": 1, "limit": 50, "total": 150 }
}
```

### POST /leads
Create a new lead.

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "email": "jane@example.com",
  "company": "Tech Corp"
}
```

### POST /leads/import
Import leads from CSV. **Managers only.**

| Form Field | Type | Description |
|------------|------|-------------|
| file | File | CSV file |
| mode | string | `round_robin` or `weighted` |

**Response:**
```json
{
  "importId": "uuid",
  "totalRows": 100,
  "imported": 98,
  "failed": 2,
  "errors": [...]
}
```

### GET /leads/:id/optimal-time
Get AI-predicted best time to call.

**Response:**
```json
{
  "optimalHour": 14,
  "optimalDay": 2,
  "pickupProbability": 85.5
}
```

---

## Calls Endpoints

### POST /calls
Log a call.

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "leadId": "uuid (optional)",
  "callType": "outbound",
  "callSource": "voip|sim|manual",
  "startedAt": "2024-01-09T10:00:00Z",
  "endedAt": "2024-01-09T10:05:30Z",
  "durationSeconds": 330,
  "disposition": "connected",
  "isAnswered": true,
  "recordingUrl": "https://..."
}
```

### POST /calls/ghost-sync
Background sync from mobile app.

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "startedAt": "2024-01-09T10:00:00Z",
  "endedAt": "2024-01-09T10:05:30Z",
  "durationSeconds": 330,
  "callType": "outbound"
}
```

### PUT /calls/:id/disposition
Update call disposition.

```json
{ "disposition": "converted", "notes": "Closed the deal!" }
```

---

## Analytics Endpoints

### GET /analytics/team
Team performance overview. **Managers only.**

| Param | Type | Description |
|-------|------|-------------|
| period | string | `7d`, `30d`, `90d` (default: 30d) |

### GET /analytics/heatmap
Call pickup probability heatmap. **Managers only.**

**Response:**
```json
{
  "grid": [[0, 15, 45, ...], ...],     // 7x24 matrix (day x hour)
  "attempts": [[0, 5, 12, ...], ...],  // Attempt counts
  "bestTimes": [
    { "day_of_week": 2, "hour_of_day": 14, "pickup_rate": 85.5 }
  ]
}
```

### GET /analytics/war-room
Real-time war room data. **Managers only.**

---

## Leaderboard Endpoints

### GET /leaderboard/top
Get top rankings.

| Param | Type | Description |
|-------|------|-------------|
| limit | int | Number of rankings (default: 10) |

**Response:**
```json
{
  "rankings": [
    { "repId": "uuid", "xp": 1500, "rank": 1, "firstName": "John", "lastName": "Doe" }
  ]
}
```

### GET /leaderboard/rep/:id
Get individual rep stats with AI coaching tip.

**Response:**
```json
{
  "repId": "uuid",
  "xp": 1500,
  "rank": 4,
  "totalCalls": 120,
  "answeredCalls": 85,
  "talkMinutes": 340,
  "conversions": 12,
  "conversionRatio": 10.0,
  "aiCoachingTip": "John: Increasing talk time by 2 mins could boost conversion by 15%"
}
```

---

## AI Endpoints

### POST /ai/analyze
Analyze call recording with Conversation DNA.

**Request:**
```json
{
  "callId": "uuid",
  "audioUrl": "https://..." // Optional if transcript exists
}
```

**Response:**
```json
{
  "callId": "uuid",
  "analysis": {
    "sentimentScore": 8,
    "sentimentLabel": "positive",
    "summaryBullets": ["Discussed pricing options", "Customer interested in premium tier", "Scheduled follow-up call"],
    "actionItems": [{ "text": "Follow up on Tuesday", "dueDate": "2024-01-14T00:00:00Z" }]
  }
}
```

### POST /ai/battlecard
Generate real-time rebuttal for objection.

**Request:**
```json
{
  "objection": "It's too expensive for our budget",
  "context": { "productName": "VocalPulse Pro" }
}
```

**Response:**
```json
{
  "battlecard": {
    "id": "uuid",
    "rebuttal": "I completely understand budget concerns. Many of our clients found that the ROI from increased rep productivity paid for the platform within 60 days. What if we could structure a pilot to prove the value first?",
    "source": "ai_generated"
  }
}
```

---

## WebSocket Events

### Namespace: /leaderboard
| Event | Direction | Payload |
|-------|-----------|---------|
| join_org | Client → Server | orgId |
| rank_update | Server → Client | rankings[] |
| heartbeat | Client → Server | - |
| heartbeat_ack | Server → Client | { timestamp } |

### Namespace: /warroom
| Event | Direction | Payload |
|-------|-----------|---------|
| join_org | Client → Server | orgId |
| activity | Server → Client | { repId, repName, type, leadName, duration } |
| milestone | Server → Client | { repId, repName, type, value, message } |
| ghost_sync | Server → Client | { repId, repName, callDuration, leadPhone } |

---

## XP Scoring Formula
```
XP = (Calls × 10) + (TalkMinutes × 5) + (Conversions × 100) - (MissedFollowups × 50)
```
