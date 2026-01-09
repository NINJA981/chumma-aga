const http = require('http');

const data = JSON.stringify({
    email: "demo@vocalpulse.com",
    password: "password123",
    firstName: "Demo",
    lastName: "User",
    orgName: "Demo Corp"
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => console.log('Body:', body));
});

req.on('error', (error) => {
    console.error('Request Error:', error);
});

req.write(data);
req.end();
