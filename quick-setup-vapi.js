#!/usr/bin/env node

/**
 * TheChattyAI Quick Setup Script
 * Run this to configure your Vapi.ai voice agent in minutes
 */

const readline = require('readline');
const fs = require('fs');
const axios = require('axios');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

console.log('\n🎙️  Welcome to TheChattyAI Voice Agent Setup!\n');
console.log('This wizard will help you configure your voice appointment booking system.\n');

async function setup() {
  try {
    // Step 1: Get business information
    console.log('📋 Step 1: Business Information\n');
    
    const businessName = await question('What is your business name? ');
    const businessType = await question('What type of business? (salon/medical/fitness/other): ');
    const timezone = await question('Your timezone (e.g., America/Los_Angeles): ') || 'America/Los_Angeles';
    
    // Step 2: Get JWT token
    console.log('\n🔑 Step 2: Authentication\n');
    console.log('You need a JWT token from your calendar API.');
    console.log('If you don\'t have one, visit: https://thechattyai.com/get-token\n');
    
    const jwtToken = await question('Enter your JWT token: ');
    
    // Step 3: Configure services
    console.log('\n🛠️  Step 3: Services Configuration\n');
    
    let services = [];
    let addMore = true;
    
    while (addMore) {
      const serviceName = await question('Enter a service name (or press Enter to finish): ');
      if (!serviceName) {
        addMore = false;
      } else {
        const duration = await question(`How many minutes for ${serviceName}? (default: 30): `) || '30';
        services.push({
          name: serviceName,
          duration: parseInt(duration)
        });
      }
    }
    
    // Step 4: Business hours
    console.log('\n⏰ Step 4: Business Hours\n');
    
    const openTime = await question('Opening time (e.g., 9:00 AM): ');
    const closeTime = await question('Closing time (e.g., 6:00 PM): ');
    const workDays = await question('Working days (e.g., Mon-Fri or Mon-Sat): ');
    
    // Generate configuration
    const config = {
      businessInfo: {
        name: businessName,
        type: businessType,
        timezone: timezone
      },
      authentication: {
        jwtToken: jwtToken,
        apiUrl: 'https://chattyai-calendar-bot-1.onrender.com'
      },
      services: services,
      businessHours: {
        open: openTime,
        close: closeTime,
        days: workDays
      },
      vapiWebhookUrl: `https://your-domain.com/vapi-webhook`
    };
    
    // Step 5: Generate files
    console.log('\n🎯 Step 5: Generating Configuration\n');
    
    // Generate webhook handler
    const webhookCode = generateWebhookHandler(config);
    fs.writeFileSync('vapi-webhook-handler.js', webhookCode);
    console.log('✅ Created: vapi-webhook-handler.js');
    
    // Generate Vapi configuration
    const vapiConfig = generateVapiConfig(config);
    fs.writeFileSync('vapi-assistant-config.json', JSON.stringify(vapiConfig, null, 2));
    console.log('✅ Created: vapi-assistant-config.json');
    
    // Generate conversation script
    const script = generateConversationScript(config);
    fs.writeFileSync('vapi-conversation-script.md', script);
    console.log('✅ Created: vapi-conversation-script.md');
    
    // Step 6: Test the setup
    console.log('\n🧪 Step 6: Testing Your Setup\n');
    
    const testNow = await question('Would you like to test the connection now? (y/n): ');
    
    if (testNow.toLowerCase() === 'y') {
      console.log('\nTesting calendar API connection...');
      
      try {
        const response = await axios.get(
          `${config.authentication.apiUrl}/health`
        );
        console.log('✅ API is reachable!');
        
        // Test with JWT
        const authResponse = await axios.get(
          `${config.authentication.apiUrl}/get-availability`,
          {
            headers: {
              'Authorization': `Bearer ${config.authentication.jwtToken}`
            }
          }
        );
        console.log('✅ Authentication successful!');
        console.log(`📅 Found ${authResponse.data.slots.length} available slots`);
        
      } catch (error) {
        console.log('❌ Connection test failed:', error.message);
        console.log('Please check your JWT token and try again.');
      }
    }
    
    // Final instructions
    console.log('\n🎉 Setup Complete!\n');
    console.log('Next steps:');
    console.log('1. Deploy vapi-webhook-handler.js to your server');
    console.log('2. Upload vapi-assistant-config.json to Vapi.ai');
    console.log('3. Copy the conversation script to your Vapi assistant');
    console.log('4. Update the webhook URL in your Vapi settings');
    console.log('5. Make a test call to your Vapi phone number!');
    
    console.log('\n📞 Need help? Visit: https://thechattyai.com/support');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

function generateWebhookHandler(config) {
  return `const express = require('express');
const axios = require('axios');
const { TheChattyAICalendarIntegration, vapiHandlers } = require('vapi-integration-enhanced');

const app = express();
app.use(express.json());

// Configuration
const integrationConfig = {
  apiUrl: '${config.authentication.apiUrl}',
  jwtToken: '${config.authentication.jwtToken}',
  timezone: '${config.businessInfo.timezone}',
  businessHours: {
    start: ${parseTime(config.businessHours.open)},
    end: ${parseTime(config.businessHours.close)},
    workDays: ${generateWorkDays(config.businessHours.days)}
  }
};

// Vapi webhook endpoint
app.post('/vapi-webhook', async (req, res) => {
  const { function: functionName, parameters } = req.body;
  
  try {
    const handler = vapiHandlers[functionName];
    if (!handler) {
      return res.json({ error: 'Unknown function' });
    }
    
    const result = await handler(parameters, { config: integrationConfig });
    res.json(result);
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.json({
      response: "I'm having technical difficulties. Please try again in a moment."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`✅ Vapi webhook handler running on port \${PORT}\`);
});
`;
}

function generateVapiConfig(config) {
  return {
    name: `${config.businessInfo.name} Booking Assistant`,
    functions: [
      {
        name: "checkAvailability",
        description: "Check available appointment slots",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date to check availability"
            },
            timePreference: {
              type: "string",
              description: "Preferred time of day"
            }
          }
        }
      },
      {
        name: "bookAppointment",
        description: "Book an appointment",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string" },
            time: { type: "string" },
            customerName: { type: "string" },
            customerPhone: { type: "string" },
            serviceType: { type: "string" }
          },
          required: ["date", "time", "customerName"]
        }
      }
    ],
    serverUrl: config.vapiWebhookUrl
  };
}

function generateConversationScript(config) {
  const serviceList = config.services.map(s => s.name).join(', ');
  
  return `# ${config.businessInfo.name} Voice Assistant Script

## Initial Greeting
"Thank you for calling ${config.businessInfo.name}! I'm your automated booking assistant. I can help you schedule ${serviceList}. How can I help you today?"

## Service Inquiry
When asked about services:
"We offer ${serviceList}. Which service would you like to book?"

## Availability Check
When checking availability:
"Let me check what times we have available. What day works best for you?"

## Booking Confirmation
Before finalizing:
"Perfect! Let me confirm your appointment:
- Service: [SERVICE]
- Date: [DATE]
- Time: [TIME]
- Name: [NAME]

Is everything correct?"

## Closing
"Great! Your appointment is confirmed. We'll see you on [DATE] at [TIME]. We'll send you a reminder the day before. Have a wonderful day!"

## Business Hours
"We're open ${config.businessHours.days} from ${config.businessHours.open} to ${config.businessHours.close}."

## Error Handling
If something goes wrong:
"I apologize, I'm having trouble with that request. Let me try another way, or you can call us directly during business hours."
`;
}

function parseTime(timeStr) {
  // Convert "9:00 AM" to 9, "6:00 PM" to 18
  const [time, period] = timeStr.split(' ');
  let [hours] = time.split(':').map(Number);
  
  if (period && period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return hours;
}

function generateWorkDays(daysStr) {
  if (daysStr.toLowerCase().includes('mon-fri')) {
    return '[1, 2, 3, 4, 5]';
  } else if (daysStr.toLowerCase().includes('mon-sat')) {
    return '[1, 2, 3, 4, 5, 6]';
  } else {
    return '[1, 2, 3, 4, 5]'; // Default to weekdays
  }
}

// Run setup
setup(); 