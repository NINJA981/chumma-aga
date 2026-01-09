
import { execute, queryOne } from '../config/database.js';
import { io } from '../config/socket.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import axios from 'axios';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const processAIAnalysis = async (callId, recordingUrl) => {
    try {
        console.log(`Starting AI analysis for call ${callId}`);

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

        // 2. Transcribe with Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
        });

        const transcriptText = transcription.text;

        // Cleanup temp file
        fs.unlinkSync(tempFilePath);

        // Update transcript in DB
        execute('UPDATE calls SET transcript = ? WHERE id = ?', [transcriptText, callId]);

        // 3. Analyze with GPT-4o
        const systemPrompt = `
            You are a sales analyst. Analyze this call transcript.
            1. Summarize the call in 2 sentences.
            2. Extract 'Lead Intent' (Hot, Warm, Cold).
            3. Extract 'Next Action' mentioned and a date if possible.
            4. Determine Sentiment (Positive, Neutral, Negative).
            
            Return JSON: { "summary": "...", "intent": "...", "next_action": "...", "sentiment": "..." }
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: transcriptText }
            ],
            response_format: { type: "json_object" }
        });

        const analysis = JSON.parse(completion.choices[0].message.content);

        // 4. Save Analysis to DB
        // Insert or Update call_analysis table
        const analysisId = crypto.randomUUID(); // Need polyfill if < Node 19

        // Map sentiment string to score approx? Or just save label.
        // basic schema has sentiment_score, sentiment_label
        let score = 5;
        if (analysis.sentiment === 'Positive') score = 8;
        if (analysis.sentiment === 'Negative') score = 3;

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
            analysis.sentiment,
            analysis.summary,
            JSON.stringify([analysis.next_action])
        ]);

        // 5. Emit Socket Event for Real-time Dashboard Update
        // Need org_id from call
        const call = queryOne('SELECT org_id FROM calls WHERE id = ?', [callId]);
        if (call) {
            io.to(call.org_id).emit('call_analyzed', {
                callId,
                summary: analysis.summary,
                sentiment: analysis.sentiment
            });
        }

        console.log(`AI Analysis complete for ${callId}`);

    } catch (error) {
        console.error(`AI Analysis failed for ${callId}:`, error);
    }
};
