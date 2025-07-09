const jwt = require('jsonwebtoken');
const fs = require('fs');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No valid token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - Token missing' });
    }

    // Use the same JWT secret as the main application
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('✅ JWT decoded successfully:', {
        api_key: decoded.api_key,
        client_id: decoded.client_id,
        business_name: decoded.business_name
      });
      
      // Load actual credentials and token from files
      let credentials, googleToken;
      
      try {
        // Load credentials
        if (process.env.GOOGLE_CREDENTIALS) {
          credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        } else if (fs.existsSync('credentials.json')) {
          credentials = JSON.parse(fs.readFileSync('credentials.json'));
        } else {
          throw new Error('No credentials found');
        }
        
        // Load token
        if (process.env.GOOGLE_TOKEN) {
          googleToken = JSON.parse(process.env.GOOGLE_TOKEN);
        } else if (fs.existsSync('token.json')) {
          googleToken = JSON.parse(fs.readFileSync('token.json'));
        } else {
          throw new Error('No token found');
        }
      } catch (error) {
        console.error('❌ Error loading Google credentials/token:', error);
        return res.status(500).json({ error: 'Google authentication not configured' });
      }
      
      // Create tenant with actual credentials and decoded JWT data
      const tenant = {
        id: decoded.client_id || 'demo-client',
        name: decoded.business_name || 'Demo Business',
        api_key: decoded.api_key,
        email: decoded.email,
        g_credentials: credentials,
        g_token: googleToken
      };

      req.tenant = tenant;
      console.log(`🔐 Auth successful for client: ${tenant.name} (${tenant.id})`);
      next();
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      return res.status(403).json({ error: 'Forbidden - Invalid token' });
    }
  } catch (err) {
    console.error('❌ Auth middleware error:', err.message);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}; 