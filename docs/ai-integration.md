# VocalPulse AI Integration Architecture

## Overview
VocalPulse uses Google's Gemini API (Gemini 1.5 Flash) for intelligent call analysis, offering high performance and a generous free tier.

---

## AI Features

| Feature | Technology | Trigger |
|---------|------------|---------|
| **Transcription** | Gemini 1.5 Flash (Multimodal) | Call recording uploaded |
| **Conversation DNA** | Gemini 1.5 Flash | After transcription (calls >30s) |
| **Battlecards** | Gemini 1.5 Flash | Real-time objection detection |
| **Predictive Coaching** | Gemini 1.5 Flash | Mid-pack reps viewed on leaderboard |

---

## 1. Transcription Service

### Flow
```
Audio URL → Fetch/Buffer → Gemini Multimodal → Transcript → Database
```

### Implementation
```typescript
// backend/src/services/ai/transcription.ts
import { getModel } from './gemini.js';

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const model = getModel('gemini-1.5-flash');
  // ... fetch audio ...
  const result = await model.generateContent([
    "Transcribe this audio file verbatim.",
    { inlineData: { mimeType: "audio/mp3", data: base64Audio } }
  ]);
  return result.response.text();
}
```

---

## 2. Conversation DNA Analysis

### Output Schema
```typescript
interface ConversationAnalysis {
  sentimentScore: number;        // 1-10 (1=Angry, 10=Delighted)
  sentimentLabel: string;        // 'angry' | 'neutral' | 'delighted'
  sentimentReasoning: string;
  summaryBullets: string[];      // 3 bullet points
  fullSummary: string;           // 2-sentence summary
  actionItems: {
    text: string;
    dueDate: Date | null;
  }[];
  keywords: string[];
  topics: string[];
}
```

### Prompt Engineering
```typescript
const systemPrompt = `You are a sales call analyst AI. ...
Respond ONLY in this exact JSON format: ...`;

const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
});
```

---

## 3. Real-Time Battlecards

### Architecture
```
VoIP Call → Twilio Media Stream → WebSocket → Objection Detection → Gemini 1.5 Flash → Battlecard UI
```

### AI Rebuttal Generation
```typescript
async function generateBattlecard(objection: string): Promise<string> {
  const model = getModel('gemini-1.5-flash');
  const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 150 }
  });
  return result.response.text();
}
```

---

## Cost Optimization

| Model | Use Case | Cost |
|-------|----------|------|
| Gemini 1.5 Flash | All Features | Free (within limits) |

### Strategies
1. **Cache battlecards** - Reuse for common objections
2. **Skip short calls** - Only analyze calls >30 seconds
3. **Batch processing** - Queue calls with Bull, process in batches
4. **Quick detection** - Use local patterns before API calls
