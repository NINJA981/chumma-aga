import { getModel } from './gemini.js';
import { config } from '../../config/env.js';

/**
 * Transcribe audio using Gemini 1.5 Flash (Multimodal)
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
    if (!config.gemini.apiKey) {
        throw new Error('Gemini API key not configured');
    }

    try {
        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return await transcribeAudioBuffer(buffer);
    } catch (error) {
        console.error('Transcription error:', error);
        throw new Error('Failed to transcribe audio');
    }
}

/**
 * Transcribe audio from buffer
 */
export async function transcribeAudioBuffer(
    buffer: Buffer,
    filename: string = 'audio.mp3'
): Promise<string> {
    if (!config.gemini.apiKey) {
        throw new Error('Gemini API key not configured');
    }

    try {
        const model = getModel('gemini-1.5-flash');

        // Convert buffer to base64
        const base64Audio = buffer.toString('base64');

        const result = await model.generateContent([
            "Transcribe this audio file verbatim. output only the transcript.",
            {
                inlineData: {
                    mimeType: "audio/mp3",
                    data: base64Audio
                }
            }
        ]);

        return result.response.text();
    } catch (error) {
        console.error('Transcription error:', error);
        throw new Error('Failed to transcribe audio');
    }
}
