
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/env.js';

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient() {
    if (!genAI) {
        if (!config.gemini.apiKey) {
            throw new Error('Gemini API key not configured');
        }
        genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    }
    return genAI;
}

export function getModel(modelName: string = 'gemini-1.5-flash') {
    const client = getGeminiClient();
    return client.getGenerativeModel({ model: modelName });
}
