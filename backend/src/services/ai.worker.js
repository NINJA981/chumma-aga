
import { execute, queryOne } from '../config/database.js';
import { io } from '../config/socket.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import axios from 'axios';

// Import Gemini-based services (FREE)
import { transcribeAudioBuffer } from './ai/transcription.js';
import { analyzeConversation } from './ai/analysis.js';

/**
 * Process AI Analysis using Google Gemini (FREE alternative to OpenAI)
 * - Transcription: Gemini 1.5 Flash multimodal
 * - Analysis: Gemini 1.5 Flash text
 */
export const processAIAnalysis = async (callId, recordingUrl) => {
    try {
        console.log(`Starting AI analysis for call ${callId} (using Gemini - FREE)`);

        // 1. Download Audio
        const tempFilePath = path.join(os.tmpdir(), `${callId}.mp3`);
        const writer = fs.createWriteStream(tempFilePath);

        const response = await axios({
            url: recordingUrl,
            method: 'GET',
            responseType: 'stream',
        });

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // 2. Transcribe with Gemini (FREE - replaces OpenAI Whisper)
        const audioBuffer = fs.readFileSync(tempFilePath);
        const transcriptText = await transcribeAudioBuffer(audioBuffer, `${callId}.mp3`);

        // Cleanup temp file
        fs.unlinkSync(tempFilePath);

        // Update transcript in DB
        execute('UPDATE calls SET transcript = ? WHERE id = ?', [transcriptText, callId]);

        // 3. Analyze with Gemini (FREE - replaces OpenAI GPT-4)
        const analysisResult = await analyzeConversation(transcriptText);

        // 4. Save Analysis to DB
        const score = analysisResult.sentimentScore;

        // Map Gemini sentiment labels to simple labels
        let sentimentLabel = 'Neutral';
        if (analysisResult.sentimentLabel === 'positive' || analysisResult.sentimentLabel === 'delighted') {
            sentimentLabel = 'Positive';
        } else if (analysisResult.sentimentLabel === 'angry' || analysisResult.sentimentLabel === 'frustrated') {
            sentimentLabel = 'Negative';
        }

        // Extract next action from action items
        const nextAction = analysisResult.actionItems.length > 0
            ? analysisResult.actionItems[0].text
            : '';

        execute(`
            INSERT INTO call_analysis (
                id, call_id, sentiment_score, sentiment_label, summary, 
                action_items, created_at
            ) VALUES (
                lower(hex(randomblob(16))), ?, ?, ?, ?, ?, datetime('now')
            )
        `, [
            callId,
            score,
            sentimentLabel,
            analysisResult.fullSummary,
            JSON.stringify(analysisResult.actionItems.map(a => a.text))
        ]);

        // 5. Emit Socket Event for Real-time Dashboard Update
        const call = queryOne('SELECT org_id FROM calls WHERE id = ?', [callId]);
        if (call) {
            io.to(call.org_id).emit('call_analyzed', {
                callId,
                summary: analysisResult.fullSummary,
                sentiment: sentimentLabel,
                sentimentScore: score,
                bulletPoints: analysisResult.summaryBullets,
                actionItems: analysisResult.actionItems.map(a => a.text)
            });
        }

        console.log(`AI Analysis complete for ${callId} (Gemini - FREE)`);

    } catch (error) {
        console.error(`AI Analysis failed for ${callId}:`, error);
    }
};
