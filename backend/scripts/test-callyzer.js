
// Test script for Callyzer Webhook
// Usage: node scripts/test-callyzer.js

const API_URL = 'http://localhost:3001/api/webhooks/call-sync';
const SECRET = 'YOUR_SECRET_HERE'; // Set this if you have CALLYZER_SIGNING_SECRET in .env

// Mock Payload matching Callyzer v2.1 structure
const payload = {
    employees: [
        {
            emp_number: "EMP001", // Make sure this matches a user in your DB, or the script logs a warning
            logs: [
                {
                    id: `call_${Date.now()}`,
                    call_type: "Missed", // Triggers 'missed_call_alert' socket event
                    number: "+15550199",
                    date: Date.now(),
                    duration: 0,
                    recording_url: null, // No AI for missed call
                    note: "Missed call simulation"
                },
                {
                    id: `call_${Date.now() + 1}`,
                    call_type: "Outgoing",
                    number: "+15550200",
                    date: Date.now(),
                    duration: 125,
                    recording_url: "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav", // Sample audio
                    note: "Good lead, interested in pricing."
                }
            ]
        }
    ]
};

async function runTest() {
    console.log('🚀 Sending Callyzer Webhook Simulation...');
    console.log(`Target: ${API_URL}`);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-callyzer-secret': SECRET
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log('\n✅ Response Status:', response.status);
        console.log('✅ Response Body:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n🎉 Test Passed! Check your Dashboard for:');
            console.log('   1. A new "Missed Call" alert.');
            console.log('   2. A new call log "Processing AI Analysis..." (if worker is running).');
        } else {
            console.log('\n❌ Test Failed. Check backend logs.');
        }

    } catch (error) {
        console.error('\n❌ Connection Error:', error.message);
        console.log('Hint: Is the backend server running on port 3001?');
    }
}

runTest();
