
import { getModel } from './gemini.js';

export async function chatWithAI(message: string, context?: string) {
    const model = getModel();

    let prompt = `You are a helpful sales assistant.
    Your goal is to help the salesperson during an ongoing call.
    Keep your answers concise, direct, and actionable. You should be able to be read quickly while the salesperson is on the phone.
    If the user asks for a script or a rebuttal, provide exactly that.
    
    User Query: ${message}`;

    if (context) {
        prompt += `\n\nContext about the current situation/lead:\n${context}`;
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating content with Gemini:", error);
        throw error;
    }
}
