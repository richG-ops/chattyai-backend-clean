# 🚀 Vapi.ai Manual Setup Guide - Step by Step

## Prerequisites
- ✅ Your calendar API is live at: `https://chattyai-calendar-bot-1.onrender.com`
- ✅ You have a JWT token for authentication
- ✅ You need a Vapi.ai account (free tier works to start)

---

## Step 1: Deploy Your Webhook Handler First

Before configuring Vapi, you need a live webhook endpoint. Here's the quickest way:

### Option A: Deploy to Vercel (Recommended - 5 minutes)
```bash
# 1. Create a new file: api/vapi-webhook.js
mkdir api
touch api/vapi-webhook.js
```

```javascript
// api/vapi-webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { function: functionName, parameters } = req.body;
  
  // Your configuration
  const config = {
    apiUrl: 'https://chattyai-calendar-bot-1.onrender.com',
    jwtToken: 'YOUR_JWT_TOKEN_HERE' // Replace with your actual token
  };
  
  try {
    switch(functionName) {
      case 'checkAvailability':
        // Call your calendar API
        const availabilityResponse = await fetch(`${config.apiUrl}/get-availability`, {
          headers: { 'Authorization': `Bearer ${config.jwtToken}` }
        });
        const slots = await availabilityResponse.json();
        
        // Format for voice
        if (slots.slots && slots.slots.length > 0) {
          const formattedSlots = slots.slots.slice(0, 3).map((slot, i) => {
            const date = new Date(slot.start);
            return `Option ${i + 1}: ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
          }).join(', ');
          
          return res.json({
            response: `I found ${slots.slots.length} available times. ${formattedSlots}. Which works best for you?`
          });
        } else {
          return res.json({
            response: "I'm sorry, I don't see any available appointments right now. Would you like me to check another day?"
          });
        }
        
      case 'bookAppointment':
        const { date, time, customerName, customerPhone, serviceType } = parameters;
        
        // Parse the natural language date/time
        // For now, assume they're in a parseable format
        const appointmentDate = new Date(`${date} ${time}`);
        const endDate = new Date(appointmentDate.getTime() + 30 * 60000); // 30 minutes later
        
        const bookingResponse = await fetch(`${config.apiUrl}/book-appointment`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.jwtToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            start: appointmentDate.toISOString(),
            end: endDate.toISOString(),
            summary: `${serviceType || 'Appointment'} - ${customerName}`
          })
        });
        
        if (bookingResponse.ok) {
          return res.json({
            response: `Perfect! I've booked your ${serviceType || 'appointment'} for ${date} at ${time}. We'll see you then, ${customerName}!`
          });
        } else {
          return res.json({
            response: "I'm sorry, I couldn't book that time. Let me check what else is available."
          });
        }
        
      default:
        return res.json({
          response: "I didn't understand that request. Could you please try again?"
        });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return res.json({
      response: "I'm having technical difficulties. Please try again in a moment or call us directly."
    });
  }
}
```

### Deploy to Vercel:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Your webhook URL will be: https://your-app.vercel.app/api/vapi-webhook
```

---

## Step 2: Configure Vapi Assistant

### 1. Go to Vapi Dashboard
- Navigate to: https://dashboard.vapi.ai
- Click "Assistants" → "Create New Assistant"

### 2. Basic Configuration
```yaml
Assistant Name: "Calendar Booking Bot"
First Message: "Thanks for calling! I can help you book an appointment. What service are you looking for today?"
Model: "gpt-3.5-turbo" (or gpt-4 for better quality)
Voice: "josh" (male) or "jessica" (female)
Language: "en-US"
```

### 3. Add Your Functions
Click "Functions" tab and add these EXACTLY:

#### Function 1: checkAvailability
```json
{
  "name": "checkAvailability",
  "description": "Use this when the caller asks about available times, says they want to book an appointment, or asks when they can come in",
  "parameters": {
    "type": "object",
    "properties": {
      "date": {
        "type": "string",
        "description": "The date they want like 'tomorrow', 'next Monday', 'January 15th'"
      },
      "timePreference": {
        "type": "string", 
        "description": "Their time preference like 'morning', 'afternoon', 'after 3pm'"
      }
    },
    "required": []
  }
}
```

#### Function 2: bookAppointment
```json
{
  "name": "bookAppointment",
  "description": "Use this to book the appointment once the caller confirms a specific date and time",
  "parameters": {
    "type": "object",
    "properties": {
      "date": {
        "type": "string",
        "description": "The confirmed date like 'tomorrow', 'January 15th', 'next Tuesday'"
      },
      "time": {
        "type": "string",
        "description": "The confirmed time like '2:30 PM', '10 AM', '15:00'"
      },
      "customerName": {
        "type": "string",
        "description": "The customer's full name"
      },
      "customerPhone": {
        "type": "string",
        "description": "The customer's phone number"
      },
      "serviceType": {
        "type": "string",
        "description": "What service they want like 'haircut', 'color', 'consultation'"
      }
    },
    "required": ["date", "time", "customerName"]
  }
}
```

### 4. Set Your Webhook URL
In the Functions section:
```
Server URL: https://your-app.vercel.app/api/vapi-webhook
```

### 5. Add Conversation Instructions
In the "Instructions" or "System Prompt" field:

```markdown
You are a friendly appointment booking assistant for a business. Your job is to help callers schedule appointments.

CONVERSATION FLOW:
1. Greet warmly and ask what service they need
2. When they tell you the service, use checkAvailability to find times
3. Present 2-3 available options clearly
4. When they pick one, collect their name and phone number
5. Confirm all details before booking
6. Use bookAppointment to finalize
7. End with a friendly confirmation

IMPORTANT RULES:
- Always be conversational and natural
- If no times are available, apologize and suggest checking another day
- Always confirm the appointment details before booking
- Collect name and phone number before finalizing any booking
- If they ask to cancel or reschedule, politely explain they need to call during business hours

EXAMPLE PHRASES:
- "I'd be happy to help you book an appointment!"
- "Let me check what times we have available."
- "I have a few options for you..."
- "Perfect! Can I get your name please?"
- "And what's the best phone number to reach you?"
- "Let me confirm: [details]. Is that correct?"
- "You're all set! We'll see you then!"
```

---

## Step 3: Get a Phone Number

### In Vapi Dashboard:
1. Go to "Phone Numbers"
2. Click "Buy Number"
3. Choose a local number (costs ~$1-2/month)
4. Assign it to your assistant

---

## Step 4: Test Your Setup

### Test Call Flow:
1. **Call your Vapi number**
2. **Say**: "I'd like to book an appointment"
3. **Bot should**: Check availability and present options
4. **Say**: "Tomorrow at 2 PM works great"
5. **Bot should**: Ask for your name and phone
6. **Provide**: Your details
7. **Bot should**: Confirm and book the appointment

### Check Your Calendar:
The appointment should appear in your Google Calendar immediately!

---

## Step 5: Common Issues & Fixes

### "I don't see any available times"
- Check your JWT token is correct in the webhook
- Verify your calendar API is running
- Ensure your Google Calendar has available slots

### "Booking failed"
- Check the date/time parsing in your webhook
- Verify the timezone handling
- Check API logs for errors

### Bot doesn't understand commands
- Make the instructions more specific
- Add example phrases to the function descriptions
- Test with simpler commands first

---

## Step 6: Production Checklist

Before giving to clients:

- [ ] Test at least 10 successful bookings
- [ ] Test edge cases (no availability, wrong dates, etc.)
- [ ] Set up error logging (Sentry recommended)
- [ ] Create client-specific greeting
- [ ] Test different accents/speaking speeds
- [ ] Verify timezone handling
- [ ] Set up monitoring alerts

---

## Step 7: Client Onboarding Script

When setting up for a client:

```bash
# 1. Clone webhook template
git clone your-webhook-template

# 2. Update configuration
- Add their JWT token
- Set their business name
- Configure services

# 3. Deploy their webhook
vercel --prod

# 4. Create their Vapi assistant
- Use their business name
- Set custom greeting
- Add their services to prompts

# 5. Assign phone number
- Buy local number in their area code
- Forward to their business for fallback

# 6. Test thoroughly
- Make 5 test bookings
- Verify calendar integration
- Test error scenarios
```

---

## 🎯 Quick Reference URLs

- Vapi Dashboard: https://dashboard.vapi.ai
- Your Calendar API: https://chattyai-calendar-bot-1.onrender.com
- Vercel Dashboard: https://vercel.com/dashboard
- Test Phone Numbers: Use your cell phone!

---

## 🚀 You're Ready!

Once you complete these steps, you'll have a fully functional voice booking system. The first successful call where someone books an appointment by talking naturally to your AI - that's when the magic becomes real!

Need help? Common issues:
- Webhook not responding: Check Vercel logs
- Bot sounds robotic: Adjust conversation prompts
- Bookings not appearing: Verify JWT token and API connection

**Remember: Test thoroughly before going live with real customers!** 