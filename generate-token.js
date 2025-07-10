const jwt = require('jsonwebtoken');

// Use the same secret as the auth middleware
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

const payload = {
  api_key: '01ba168dd30c0377c1f0c74b936f4274',
  client_id: 'demo-client',
  business_name: 'Demo Business',
  email: 'demo@business.com'
};

const token = jwt.sign(payload, jwtSecret, { expiresIn: '1y' });

console.log('🔑 Generated JWT Token:');
console.log(token);
console.log('\n✅ This token is compatible with the auth middleware.');
console.log('📋 Copy this token and use it for API requests.'); 