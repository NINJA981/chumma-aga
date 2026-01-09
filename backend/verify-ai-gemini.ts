
import { generateBattlecard, detectObjection } from './src/services/ai/battlecard.js';
import { analyzeConversation } from './src/services/ai/analysis.js';
import dotenv from 'dotenv';
import { config } from './src/config/env.js';

// Load env
dotenv.config();

async function verify() {
    console.log('🔍 Verifying Gemini AI Integration...');

    if (!config.gemini.apiKey) {
        console.error('❌ GEMINI_API_KEY is missing in .env');
        console.log('Please add your API key to .env and run this script again.');
        process.exit(1);
    }
    console.log('✅ API Key found');

    try {
        // 1. Test Battlecard
        console.log('\nTesting generateBattlecard...');
        const objection = "Your price is too high compared to Competitor X";
        console.log(`Objection: "${objection}"`);
        const rebuttal = await generateBattlecard(objection);
        console.log('Rebuttal:', rebuttal);
        if (rebuttal && rebuttal.length > 0) console.log('✅ Battlecard generated');

        // 2. Test Objection Detection
        console.log('\nTesting detectObjection...');
        const transcriptChunk = "I really like the product but I just don't think we have the budget right now.";
        const detection = await detectObjection(transcriptChunk);
        console.log('Detection:', detection);
        if (detection.isObjection) console.log('✅ Objection detected');

        // 3. Test Analysis
        console.log('\nTesting analyzeConversation...');
        const transcript = `
        Sales Rep: Hi, this is John from Acme Corp. How are you?
        Customer: I'm good. I was looking at your software.
        Sales Rep: Great. What are you looking to solve?
        Customer: We need better reporting. But your pricing seems high.
        Sales Rep: We can discuss discounts. When are you looking to buy?
        Customer: Probably next month.
        Sales Rep: Okay, let's schedule a demo for next Tuesday.
        Customer: Sounds good.
        `;
        const analysis = await analyzeConversation(transcript);
        console.log('Analysis Result:', JSON.stringify(analysis, null, 2));
        if (analysis.sentimentScore) console.log('✅ Analysis complete');

    } catch (error) {
        console.error('\n❌ Verification Failed:', error);
    }
}

verify();
