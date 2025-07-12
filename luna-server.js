// Quick Luna Visual Server - No Wix Required!
const express = require('express');
const app = express();
const PORT = 3333;

// Luna visual HTML
const lunaHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Luna - Your AI Assistant</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .luna-container {
            text-align: center;
            animation: float 4s ease-in-out infinite;
        }
        .luna-avatar {
            font-size: 120px;
            animation: pulse 2s ease-in-out infinite;
            filter: drop-shadow(0 10px 30px rgba(0,0,0,0.3));
        }
        .sparkles {
            font-size: 24px;
            animation: sparkle 2s ease-in-out infinite;
        }
        .luna-text h1 {
            color: white;
            font-size: 36px;
            margin: 20px 0 10px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .luna-text p {
            color: rgba(255,255,255,0.9);
            font-size: 18px;
        }
        .appointment-info {
            background: rgba(255,255,255,0.2);
            padding: 20px;
            border-radius: 15px;
            margin-top: 30px;
            backdrop-filter: blur(10px);
            color: white;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        @keyframes sparkle {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="luna-container">
        <div class="sparkles">✨ 💫 ✨</div>
        <div class="luna-avatar">👩‍💼</div>
        <div class="luna-text">
            <h1>Hi, I'm Luna! 👋</h1>
            <p>Your AI Assistant</p>
        </div>
        <div class="appointment-info">
            <p><strong>Your appointment is confirmed!</strong></p>
            <p>I'll send you a reminder 24 hours before.</p>
            <p>📱 Questions? Call me: 702-776-0084</p>
        </div>
    </div>
</body>
</html>`;

// Routes
app.get('/', (req, res) => {
    res.send(lunaHTML);
});

app.get('/luna', (req, res) => {
    res.send(lunaHTML);
});

app.get('/luna.gif', (req, res) => {
    res.send(lunaHTML);
});

// ASCII art Luna for fun
app.get('/ascii', (req, res) => {
    res.type('text/plain');
    res.send(`
    ✨ 👩‍💼 ✨
   Luna AI Assistant
   
   "I'm here 24/7 to help!"
   
   Call me: 702-776-0084
    `);
});

// Start server
app.listen(PORT, () => {
    console.log('\n🌟 Luna Visual Server Running!');
    console.log('=====================================');
    console.log(`📱 Local URL: http://localhost:${PORT}`);
    console.log(`🌐 Luna Page: http://localhost:${PORT}/luna`);
    console.log(`🎨 GIF Link: http://localhost:${PORT}/luna.gif`);
    console.log('=====================================');
    console.log('\n💡 To make this accessible from internet:');
    console.log('1. Install ngrok: https://ngrok.com');
    console.log('2. Run: ngrok http 3333');
    console.log('3. Use the ngrok URL in your SMS!\n');
}); 