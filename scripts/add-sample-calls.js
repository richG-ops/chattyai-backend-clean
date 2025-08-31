const { getDb } = require('../db-config');
const { newId } = require('../lib/id');

async function addSampleCalls() {
  const db = getDb();
  
  const tenantId = process.env.DEFAULT_TENANT_ID || 'tenant_123';
  
  const sampleCalls = [
    {
      call_id: newId(),
      tenant_id: tenantId,
      phone_number: '+15551234567',
      started_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      ended_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 180000), // 3 min call
      duration_seconds: 180,
      outcome: 'booked',
      ai_employee: 'luna',
      cost: 0.25,
      transcript: 'Customer: Hi, I need to book a cleaning service. Luna: I\'d be happy to help you book a cleaning service! May I get your name? Customer: Yes, my name is Sarah Johnson. Luna: Great Sarah! What type of cleaning service are you looking for? Customer: I need a deep cleaning for my 3-bedroom house. Luna: Perfect! I have availability this Friday at 2 PM. Does that work for you? Customer: Yes, that sounds perfect. Luna: Excellent! I\'ve booked your deep cleaning service for Friday at 2 PM. You\'ll receive a confirmation shortly.',
      extracted_data: JSON.stringify({
        bookAppointment: {
          customerName: 'Sarah Johnson',
          customerPhone: '+15551234567',
          customerEmail: 'sarah.johnson@email.com',
          serviceType: 'Deep Cleaning',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
          time: '14:00'
        }
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      call_id: newId(),
      tenant_id: tenantId,
      phone_number: '+15559876543',
      started_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      ended_at: new Date(Date.now() - 4 * 60 * 60 * 1000 + 120000), // 2 min call
      duration_seconds: 120,
      outcome: 'info_provided',
      ai_employee: 'luna',
      cost: 0.18,
      transcript: 'Customer: Hi, what are your rates for house cleaning? Luna: Hello! I\'d be happy to share our cleaning rates with you. For a standard cleaning, we charge $25 per hour. Deep cleaning starts at $35 per hour. Customer: Do you have any availability this week? Luna: Yes, I have several slots available. Would you like me to book an appointment for you? Customer: Let me think about it and call back. Luna: Of course! Feel free to call anytime. Have a great day!',
      extracted_data: JSON.stringify({
        inquiry: {
          serviceType: 'House Cleaning',
          priceInquiry: true,
          customerInterested: true
        }
      }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      call_id: newId(),
      tenant_id: tenantId,
      phone_number: '+15555551234',
      started_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      ended_at: new Date(Date.now() - 1 * 60 * 60 * 1000 + 240000), // 4 min call
      duration_seconds: 240,
      outcome: 'booked',
      ai_employee: 'luna',
      cost: 0.35,
      transcript: 'Customer: Hello, I\'m calling about lawn care services. Luna: Hi there! I\'d love to help you with lawn care. What\'s your name? Customer: I\'m Mike Thompson. Luna: Nice to meet you Mike! What type of lawn care are you looking for? Customer: I need weekly mowing and edging for my property. Luna: Excellent! For weekly mowing and edging, I can schedule you for Thursdays. What\'s the best time? Customer: Thursday morning around 9 AM works great. Luna: Perfect! I\'ve scheduled your weekly lawn care for Thursdays at 9 AM starting this week.',
      extracted_data: JSON.stringify({
        bookAppointment: {
          customerName: 'Mike Thompson',
          customerPhone: '+15555551234',
          customerEmail: 'mike.thompson@email.com',
          serviceType: 'Weekly Lawn Care',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
          time: '09:00',
          recurring: 'weekly'
        }
      }),
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  
  try {
    console.log('🌱 Adding sample call data...');
    
    for (const call of sampleCalls) {
      await db('calls').insert(call);
      console.log(`✅ Added call: ${call.extracted_data ? JSON.parse(call.extracted_data).bookAppointment?.customerName || 'Unknown' : 'Info call'}`);
    }
    
    console.log(`🎉 Successfully added ${sampleCalls.length} sample calls!`);
    console.log('📊 Dashboard should now show call data');
    
  } catch (error) {
    console.error('❌ Error adding sample calls:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

if (require.main === module) {
  addSampleCalls().catch(console.error);
}

module.exports = { addSampleCalls }; 