const https = require('https');

const data = JSON.stringify({
  function: 'checkAvailability',
  parameters: {
    customerName: 'Test User',
    date: '2025-07-12'
  }
});

const options = {
  hostname: 'chattyai-backend-clean.onrender.com',
  port: 443,
  path: '/vapi',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🧪 Testing VAPI endpoint after manual deployment...');
console.log('📡 URL: https://chattyai-backend-clean.onrender.com/vapi');

const req = https.request(options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log(`📨 Response: ${responseData}`);
    
    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(responseData);
        console.log('🎯 VAPI Response:', parsed.response);
        console.log('🎉 SUCCESS! VAPI endpoint is working!');
      } catch (error) {
        console.log('⚠️ Response is not JSON:', responseData);
      }
    } else {
      console.log('❌ VAPI endpoint failed with status:', res.statusCode);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(data);
req.end(); 