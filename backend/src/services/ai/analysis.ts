import { getModel } from './gemini.js';
import { config } from '../../config/env.js';
import { addDays } from 'date-fns';

// ===== QUALITY SCORING INTERFACE =====
export interface CallQualityScore {
    totalPoints: number;
    breakdown: {
        sentimentPoints: number;        // sentiment * 5 (max 50)
        actionItemPoints: number;       // 10 per action (max 30)
        positiveOutcomeBonus: number;   // 0 or 25
        objectionHandlingBonus: number; // 0 or 15
        professionalGreetingBonus: number; // 0 or 5
        clearNextStepsBonus: number;    // 0 or 10
    };
    maxPossible: number;
    percentageScore: number; // 0-100%
}

export interface ConversationAnalysis {
    sentimentScore: number; // 1-10
    sentimentLabel: 'angry' | 'frustrated' | 'neutral' | 'positive' | 'delighted';
    sentimentReasoning: string;
    summaryBullets: string[];
    fullSummary: string;
    actionItems: Array<{
        text: string;
        dueDate: Date | null;
        calendarCreated: boolean;
    }>;
    keywords: string[];
    topics: string[];
    // NEW: Quality indicators for scoring
    qualityIndicators: {
        positiveOutcome: boolean;
        objectionHandled: boolean;
        professionalGreeting: boolean;
        clearNextSteps: boolean;
    };
    // NEW: Calculated quality score
    qualityScore: CallQualityScore;
}

/**
 * Calculate quality score from analysis results
 */
function calculateQualityScore(
    sentimentScore: number,
    actionItemsCount: number,
    indicators: {
        positiveOutcome: boolean;
        objectionHandled: boolean;
        professionalGreeting: boolean;
        clearNextSteps: boolean;
    }
): CallQualityScore {
    const breakdown = {
        sentimentPoints: sentimentScore * 5,
        actionItemPoints: Math.min(actionItemsCount * 10, 30), // Cap at 30
        positiveOutcomeBonus: indicators.positiveOutcome ? 25 : 0,
        objectionHandlingBonus: indicators.objectionHandled ? 15 : 0,
        professionalGreetingBonus: indicators.professionalGreeting ? 5 : 0,
        clearNextStepsBonus: indicators.clearNextSteps ? 10 : 0,
    };

    const totalPoints =
        breakdown.sentimentPoints +
        breakdown.actionItemPoints +
        breakdown.positiveOutcomeBonus +
        breakdown.objectionHandlingBonus +
        breakdown.professionalGreetingBonus +
        breakdown.clearNextStepsBonus;

    const maxPossible = 50 + 30 + 25 + 15 + 5 + 10; // 135

    return {
        totalPoints,
        breakdown,
        maxPossible,
        percentageScore: Math.round((totalPoints / maxPossible) * 100),
    };
}

/**
 * Analyze a call transcript using Gemini 1.5 Flash
 * Generates: Sentiment, Summary, Action Items, Quality Score (for Leaderboard XP)
 */
export async function analyzeConversation(transcript: string): Promise<ConversationAnalysis> {
    if (!config.gemini.apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const systemPrompt = `You are a sales call analyst AI. Analyze the following call transcript and provide:

1. SENTIMENT: Score from 1-10 (1=Angry, 5=Neutral, 10=Delighted) and a label
2. SUMMARY: 3 bullet points capturing the key discussion points
3. ACTION ITEMS: Any follow-ups mentioned (e.g., "call back Tuesday", "send proposal")
4. QUALITY INDICATORS (for scoring):
   - positiveOutcome: Did the call end positively? (boolean)
   - objectionHandled: Were customer objections addressed professionally? (boolean)
   - professionalGreeting: Did the rep greet professionally and introduce themselves? (boolean)
   - clearNextSteps: Were clear next steps discussed? (boolean)

Respond ONLY in this exact JSON format:
{
  "sentimentScore": <number 1-10>,
  "sentimentLabel": "<angry|frustrated|neutral|positive|delighted>",
  "sentimentReasoning": "<why this score>",
  "summaryBullets": ["<point 1>", "<point 2>", "<point 3>"],
  "fullSummary": "<2-sentence summary>",
  "actionItems": [{"text": "<action>", "relativeDue": "<today|tomorrow|next_week|specific_day|null>"}],
  "keywords": ["<keyword1>", "<keyword2>"],
  "topics": ["<topic1>", "<topic2>"],
  "qualityIndicators": {
    "positiveOutcome": <true|false>,
    "objectionHandled": <true|false>,
    "professionalGreeting": <true|false>,
    "clearNextSteps": <true|false>
  }
}`;

    try {
        const model = getModel('gemini-1.5-flash');

        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + `\n\nAnalyze this sales call transcript:\n\n${transcript}` }] }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const content = result.response.text();
        if (!content) {
            throw new Error('Empty response from AI');
        }

        const parsed = JSON.parse(content);

        // Process action items with date parsing
        const actionItems = (parsed.actionItems || []).map((item: any) => {
            let dueDate: Date | null = null;

            if (item.relativeDue) {
                const today = new Date();
                switch (item.relativeDue.toLowerCase()) {
                    case 'today':
                        dueDate = today;
                        break;
                    case 'tomorrow':
                        dueDate = addDays(today, 1);
                        break;
                    case 'next_week':
                        dueDate = addDays(today, 7);
                        break;
                    case 'monday':
                    case 'tuesday':
                    case 'wednesday':
                    case 'thursday':
                    case 'friday':
                        dueDate = getNextDayOfWeek(today, item.relativeDue.toLowerCase());
                        break;
                }
            }

            return {
                text: item.text,
                dueDate,
                calendarCreated: false,
            };
        });

        // Extract quality indicators (with defaults if missing)
        const qualityIndicators = {
            positiveOutcome: parsed.qualityIndicators?.positiveOutcome ?? false,
            objectionHandled: parsed.qualityIndicators?.objectionHandled ?? false,
            professionalGreeting: parsed.qualityIndicators?.professionalGreeting ?? false,
            clearNextSteps: parsed.qualityIndicators?.clearNextSteps ?? false,
        };

        // Calculate quality score for leaderboard XP
        const qualityScore = calculateQualityScore(
            Math.min(10, Math.max(1, parsed.sentimentScore)),
            actionItems.length,
            qualityIndicators
        );

        return {
            sentimentScore: Math.min(10, Math.max(1, parsed.sentimentScore)),
            sentimentLabel: parsed.sentimentLabel,
            sentimentReasoning: parsed.sentimentReasoning,
            summaryBullets: parsed.summaryBullets.slice(0, 3),
            fullSummary: parsed.fullSummary,
            actionItems,
            keywords: parsed.keywords || [],
            topics: parsed.topics || [],
            qualityIndicators,
            qualityScore,
        };
    } catch (error) {
        console.error('Analysis error:', error);
        throw new Error('Failed to analyze conversation');
    }
}

function getNextDayOfWeek(date: Date, dayName: string): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName);
    const currentDay = date.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    return addDays(date, daysUntil);
}
