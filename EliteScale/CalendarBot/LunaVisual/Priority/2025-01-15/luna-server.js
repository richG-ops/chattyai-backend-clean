const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3333;

// ELITE Luna Server - Production-Ready with Scaling
console.log('🌟 Luna Visual Server Starting...');
console.log('=====================================');

// Security headers
app.use((req, res, next) => {
  res.header('X-Powered-By', 'Luna AI');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  next();
});

// Logging middleware for monitoring
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Health check for load balancers
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'luna-visual-server',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Serve Luna GIF with proper caching
app.get('/luna.gif', (req, res) => {
  const gifPath = path.join(__dirname, 'luna.gif');
  
  if (!fs.existsSync(gifPath)) {
    // Generate placeholder if GIF doesn't exist
    console.error('⚠️  luna.gif not found - serving placeholder');
    return res.status(404).json({ 
      error: 'Luna GIF not found',
      message: 'Please generate luna.gif using the visual generation script'
    });
  }
  
  // Set caching headers for performance
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Type', 'image/gif');
  res.sendFile(gifPath);
});

// Serve Luna HTML page
app.get('/luna', (req, res) => {
  const htmlPath = path.join(__dirname, 'luna-visual.html');
  
  if (!fs.existsSync(htmlPath)) {
    // Create a beautiful Luna page on the fly
    const lunaHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Luna AI - Your Smart Assistant</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .luna-logo {
            width: 300px;
            height: 300px;
            margin: 0 auto 2rem;
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        h1 {
            color: white;
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        p {
            color: rgba(255,255,255,0.9);
            font-size: 1.2rem;
            max-width: 600px;
            margin: 0 auto;
        }
        .cta {
            margin-top: 2rem;
            padding: 1rem 2rem;
            background: white;
            color: #2a5298;
            border: none;
            border-radius: 50px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="/luna.gif" alt="Luna AI" class="luna-logo">
        <h1>Meet Luna AI</h1>
        <p>Your intelligent calendar assistant that makes booking appointments as easy as having a conversation.</p>
        <button class="cta" onclick="window.location.href='tel:+18778396798'">Call Luna Now</button>
    </div>
</body>
</html>`;
    return res.send(lunaHTML);
  }
  
  res.sendFile(htmlPath);
});

// Root redirect to Luna page
app.get('/', (req, res) => {
  res.redirect('/luna');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource ${req.path} was not found`,
    availableEndpoints: ['/', '/luna', '/luna.gif', '/health']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🌟 Luna Visual Server Running!');
  console.log('=====================================');
  console.log(`📱 Local URL: http://localhost:${PORT}`);
  console.log(`🌐 Luna Page: http://localhost:${PORT}/luna`);
  console.log(`🎨 GIF Link: http://localhost:${PORT}/luna.gif`);
  console.log('=====================================');
  console.log('💡 To make this accessible from internet:');
  console.log('1. Deploy to production (Railway/Render)');
  console.log('2. Or use ngrok: ngrok http ' + PORT);
  console.log('3. Update SMS to use production URL');
});

module.exports = app; 