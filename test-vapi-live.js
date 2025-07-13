const https = require('https');

console.log('🧪 Testing VAPI Endpoint...\n');

// Test 1: Check Availability
const checkAvailability = JSON.stringify({
  function: 'checkAvailability',
  parameters: {
    date: 'tomorrow',
    timePreference: 'morning'
  }
});

const options1 = {
  hostname: 'chattyai-backend-clean.onrender.com',
  path: '/vapi',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': checkAvailability.length
  }
};

console.log('📞 Test 1: Check Availability');
console.log(`URL: https://chattyai-backend-clean.onrender.com/vapi`);
console.log(`Body: ${checkAvailability}\n`);

const req1 = https.request(options1, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}\n`);
    
    if (res.statusCode === 200) {
      // Test 2: Book Appointment
      testBooking();
    } else {
      console.log('❌ VAPI endpoint not working properly');
    }
  });
});

req1.on('error', (e) => {
  console.error('❌ Error:', e);
});

req1.write(checkAvailability);
req1.end();

function testBooking() {
  console.log('📞 Test 2: Book Appointment');
  
  const bookAppointment = JSON.stringify({
    function: 'bookAppointment',
    parameters: {
      customerName: 'Test Customer',
      customerPhone: '+1234567890',
      customerEmail: 'test@example.com',
      date: 'tomorrow',
      time: '2 PM'
    }
  });
  
  const options2 = {
    hostname: 'chattyai-backend-clean.onrender.com',
    path: '/vapi',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': bookAppointment.length
    }
  };
  
  console.log(`Body: ${bookAppointment}\n`);
  
  const req2 = https.request(options2, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response: ${data}\n`);
      
      if (res.statusCode === 200) {
        console.log('✅ VAPI ENDPOINT IS WORKING!');
        console.log('🎉 Your system is ready for voice calls!');
      } else {
        console.log('⚠️ Booking endpoint returned non-200 status');
      }
    });
  });
  
  req2.on('error', (e) => {
    console.error('❌ Error:', e);
  });
  
  req2.write(bookAppointment);
  req2.end();
} 