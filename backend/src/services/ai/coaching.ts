import { getModel } from './gemini.js';
import { config } from '../../config/env.js';

export interface RepStats {
    repName: string;
    totalCalls: number;
    answeredCalls: number;
    talkMinutes: number;
    conversions: number;
}

/**
 * Generate AI predictive coaching tip for mid-pack reps
 * Analyzes their performance and provides actionable advice
 */
export async function getAIPredictiveCoaching(stats: RepStats): Promise<string> {
    if (!config.gemini.apiKey) {
        return generateFallbackCoaching(stats);
    }

    const systemPrompt = `You are a sales performance coach. Based on the rep's stats, generate ONE actionable coaching tip in exactly one sentence.

Focus on:
- If low talk time: suggest increasing conversation depth
- If low answer rate: suggest better call timing
- If low conversions: suggest qualification improvements
- Always be encouraging and specific

Format: "[Name]: [One specific actionable tip]"`;

    try {
        const model = getModel('gemini-1.5-flash');

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user', parts: [{
                        text: systemPrompt + `\n\nRep: ${stats.repName}
Total Calls (30d): ${stats.totalCalls}
Answered: ${stats.answeredCalls} (${Math.round(stats.answeredCalls / stats.totalCalls * 100) || 0}%)
Talk Time: ${stats.talkMinutes} minutes
Conversions: ${stats.conversions}

Generate a coaching tip:` }]
                }
            ],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.7
            }
        });

        return result.response.text() || generateFallbackCoaching(stats);
    } catch (error) {
        console.error('Coaching generation error:', error);
        return generateFallbackCoaching(stats);
    }
}

/**
 * Generate fallback coaching without AI
 */
function generateFallbackCoaching(stats: RepStats): string {
    const firstName = stats.repName.split(' ')[0];

    // Calculate metrics
    const answerRate = stats.totalCalls > 0 ? stats.answeredCalls / stats.totalCalls : 0;
    const avgTalkTime = stats.answeredCalls > 0 ? stats.talkMinutes / stats.answeredCalls : 0;
    const conversionRate = stats.totalCalls > 0 ? stats.conversions / stats.totalCalls : 0;

    // Determine biggest improvement area
    if (answerRate < 0.3) {
        return `${firstName}: Try calling leads between 10-11 AM or 2-4 PM when pickup rates are typically 20% higher.`;
    } else if (avgTalkTime < 3) {
        return `${firstName}: Your calls are quick - try asking 2 more discovery questions to increase talk time and build rapport.`;
    } else if (conversionRate < 0.05) {
        return `${firstName}: Focus on stronger qualification early - this could boost your conversion rate by 15%.`;
    } else {
        return `${firstName}: Great momentum! Consider increasing daily call volume by 10% to capitalize on your strong performance.`;
    }
}

/**
 * Batch coaching for multiple reps (for daily reports)
 */
export async function batchGenerateCoaching(
    reps: RepStats[]
): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const rep of reps) {
        try {
            const tip = await getAIPredictiveCoaching(rep);
            results.set(rep.repName, tip);
        } catch (error) {
            results.set(rep.repName, generateFallbackCoaching(rep));
        }
    }

    return results;
}
