// Simple endpoint discovery test
const https = require('https');

const endpoints = [
    { path: '/healthz', method: 'GET' },
    { path: '/health', method: 'GET' },
    { path: '/vapi', method: 'POST' },
    { path: '/vapi-webhook', method: 'POST' },
    { path: '/api/v1/webhook', method: 'POST' },
    { path: '/api/vapi-webhook', method: 'POST' },
    { path: '/get-availability', method: 'GET' },
    { path: '/monitoring/health', method: 'GET' }
];

async function testEndpoint(path, method) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'chattyai-backend-clean.onrender.com',
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            res.on('data', () => {});
            res.on('end', () => {
                console.log(`${res.statusCode === 404 ? '❌' : '✅'} ${method} ${path} → ${res.statusCode}`);
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`❌ ${method} ${path} → ERROR: ${err.message}`);
            resolve();
        });

        if (method === 'POST') {
            req.write('{}');
        }
        req.end();
    });
}

console.log('🔍 Finding working endpoints...\n');

(async () => {
    for (const endpoint of endpoints) {
        await testEndpoint(endpoint.path, endpoint.method);
    }
    console.log('\n✅ Discovery complete!');
})(); 