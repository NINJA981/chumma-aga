import { getModel } from './gemini.js';
import { config } from '../../config/env.js';

/**
 * Generate a real-time battlecard rebuttal for sales objections
 * This is the "Live Sales Coaching" feature
 */
export async function generateBattlecard(
    objection: string,
    context?: {
        productName?: string;
        industryContext?: string;
        previousObjections?: string[];
    }
): Promise<string> {
    if (!config.gemini.apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const systemPrompt = `You are an expert sales coach. A sales rep is on a live call and the customer just raised an objection. Generate a concise, powerful rebuttal that the rep can use immediately.

Rules:
- Keep response under 3 sentences
- Be empathetic but confident
- Address the concern directly
- End with a soft pivot or question to regain control

${context?.productName ? `Product: ${context.productName}` : ''}
${context?.industryContext ? `Industry: ${context.industryContext}` : ''}`;

    try {
        const model = getModel('gemini-1.5-flash');

        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + `\n\nCustomer objection: "${objection}"\n\nGenerate a rebuttal:` }] }
            ],
            generationConfig: {
                maxOutputTokens: 150,
                temperature: 0.7
            }
        });

        return result.response.text() || 'I understand your concern. Let me address that...';
    } catch (error) {
        console.error('Battlecard generation error:', error);
        // Return a generic fallback
        return 'I completely understand that concern. Many of our best customers felt the same way initially. What if we could...';
    }
}

/**
 * Detect objections in real-time from transcript chunk
 */
export async function detectObjection(transcriptChunk: string): Promise<{
    isObjection: boolean;
    objectionType: string | null;
    objectionText: string | null;
}> {
    if (!config.gemini.apiKey) {
        return { isObjection: false, objectionType: null, objectionText: null };
    }

    const systemPrompt = `You detect sales objections in conversation. Analyze if the customer is raising an objection.

Common objection types: price, timing, competitor, feature, trust, authority

Respond in JSON: {"isObjection": boolean, "objectionType": "price|timing|competitor|feature|trust|authority|null", "objectionText": "quoted text or null"}`;

    try {
        const model = getModel('gemini-1.5-flash');

        const result = await model.generateContent({
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + `\n\n${transcriptChunk}` }] }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                maxOutputTokens: 100,
                temperature: 0.2
            }
        });

        const content = result.response.text();
        if (!content) {
            return { isObjection: false, objectionType: null, objectionText: null };
        }

        return JSON.parse(content);
    } catch (error) {
        console.error('Objection detection error:', error);
        return { isObjection: false, objectionType: null, objectionText: null };
    }
}

/**
 * Common objection patterns for quick matching (no API call)
 */
export const COMMON_OBJECTIONS: Record<string, string[]> = {
    price: [
        "too expensive", "can't afford", "over budget", "cheaper option",
        "price is high", "cost too much", "don't have the budget"
    ],
    timing: [
        "not now", "bad timing", "too busy", "call me later",
        "next quarter", "after the holidays", "not ready"
    ],
    competitor: [
        "using another", "already have", "competitor", "different vendor",
        "happy with current", "locked into contract"
    ],
    feature: [
        "missing feature", "doesn't have", "need it to", "can it do",
        "integration with", "works with"
    ],
    trust: [
        "never heard of", "too new", "references", "case studies",
        "proof", "guarantee"
    ],
};

/**
 * Quick local objection detection (no API call)
 */
export function quickDetectObjection(text: string): {
    isObjection: boolean;
    objectionType: string | null;
} {
    const lowerText = text.toLowerCase();

    for (const [type, patterns] of Object.entries(COMMON_OBJECTIONS)) {
        for (const pattern of patterns) {
            if (lowerText.includes(pattern)) {
                return { isObjection: true, objectionType: type };
            }
        }
    }

    return { isObjection: false, objectionType: null };
}
