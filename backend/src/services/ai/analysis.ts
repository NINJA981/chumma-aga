import { getModel } from './gemini.js';
import { config } from '../../config/env.js';
import { addDays } from 'date-fns';

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
}

/**
 * Analyze a call transcript using Gemini 1.5 Flash
 * Generates: Sentiment, Summary, Action Items (Conversation DNA)
 */
export async function analyzeConversation(transcript: string): Promise<ConversationAnalysis> {
    if (!config.gemini.apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const systemPrompt = `You are a sales call analyst AI. Analyze the following call transcript and provide:

1. SENTIMENT: Score from 1-10 (1=Angry, 5=Neutral, 10=Delighted) and a label
2. SUMMARY: 3 bullet points capturing the key discussion points
3. ACTION ITEMS: Any follow-ups mentioned (e.g., "call back Tuesday", "send proposal")

Respond ONLY in this exact JSON format:
{
  "sentimentScore": <number 1-10>,
  "sentimentLabel": "<angry|frustrated|neutral|positive|delighted>",
  "sentimentReasoning": "<why this score>",
  "summaryBullets": ["<point 1>", "<point 2>", "<point 3>"],
  "fullSummary": "<2-sentence summary>",
  "actionItems": [{"text": "<action>", "relativeDue": "<today|tomorrow|next_week|specific_day|null>"}],
  "keywords": ["<keyword1>", "<keyword2>"],
  "topics": ["<topic1>", "<topic2>"]
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

        return {
            sentimentScore: Math.min(10, Math.max(1, parsed.sentimentScore)),
            sentimentLabel: parsed.sentimentLabel,
            sentimentReasoning: parsed.sentimentReasoning,
            summaryBullets: parsed.summaryBullets.slice(0, 3),
            fullSummary: parsed.fullSummary,
            actionItems,
            keywords: parsed.keywords || [],
            topics: parsed.topics || [],
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
