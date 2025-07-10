# 🎙️ Vapi.ai Integration Guide for TheChattyAI Calendar

## Quick Start: 5-Minute Setup

### Step 1: Add to Your Vapi Assistant

In your Vapi.ai dashboard, add these functions to your assistant:

```json
{
  "functions": [
    {
      "name": "checkAvailability",
      "description": "Check available appointment slots. The assistant should use this when the caller asks about availability, wants to know when they can book, or asks 'what times are available'",
      "parameters": {
        "type": "object",
        "properties": {
          "date": {
            "type": "string",
            "description": "The date to check like 'tomorrow', 'next Monday', 'July 14th', or leave empty for next available"
          },
          "timePreference": {
            "type": "string",
            "description": "morning, afternoon, or evening preference"
          }
        }
      }
    },
    {
      "name": "bookAppointment",
      "description": "Book an appointment when the caller provides a specific date and time",
      "parameters": {
        "type": "object",
        "properties": {
          "date": {
            "type": "string",
            "description": "The date like 'tomorrow', 'next Tuesday', 'December 25th'"
          },
          "time": {
            "type": "string",
            "description": "The time like '10:30 am', '2 pm', '3:15 PM'"
          },
          "customerName": {
            "type": "string",
            "description": "The name of the person booking"
          },
          "customerPhone": {
            "type": "string",
            "description": "Their phone number"
          },
          "serviceType": {
            "type": "string",
            "description": "What service they want"
          }
        },
        "required": ["date", "time", "customerName"]
      }
    }
  ],
  "serverUrl": "https://your-chattyai-endpoint.com/vapi"
}
```

### Step 2: Configure Your Webhook Endpoint

Create this endpoint in your application:

```javascript
// Add to your Express app
app.post('/vapi', express.json(), async (req, res) => {
  const { function: functionName, parameters } = req.body;
  
  // Your JWT token for authentication
  const config = {
    apiUrl: 'https://chattyai-calendar-bot-1.onrender.com',
    jwtToken: 'YOUR_JWT_TOKEN_HERE'
  };
  
  try {
    let response;
    
    switch(functionName) {
      case 'checkAvailability':
        response = await checkAvailability(parameters, config);
        break;
        
      case 'bookAppointment':
        response = await bookAppointment(parameters, config);
        break;
        
      default:
        response = { error: 'Unknown function' };
    }
    
    res.json(response);
  } catch (error) {
    res.json({ 
      error: 'Service temporarily unavailable',
      message: 'Please try again' 
    });
  }
});
```

### Step 3: Sample Conversation Scripts

Add these to your Vapi assistant's instructions:

```markdown
## Appointment Booking Assistant Instructions

You are a friendly appointment booking assistant. Your job is to help callers schedule appointments.

### When someone calls:
1. Greet them warmly: "Hi! Thanks for calling [Business Name]. I can help you book an appointment. What service are you looking for today?"

2. After they tell you the service, check availability by asking: "When would you like to come in? I can check what's available."

3. Use the checkAvailability function to find open slots

4. Present options clearly: "I have a few openings: [list 2-3 options]. Which works best for you?"

5. Once they choose, collect their information:
   - "Perfect! Can I get your first and last name?"
   - "And what's the best phone number to reach you?"

6. Confirm before booking: "Great! Let me confirm: [Name] for [service] on [date] at [time]. Is that correct?"

7. Book using bookAppointment function

8. Close professionally: "Your appointment is all set! We'll see you on [date] at [time]. We'll send you a reminder the day before. Have a great day!"

### Important behaviors:
- Always sound natural and conversational
- If they ask for a time that's not available, suggest alternatives
- Handle common variations like "tomorrow morning" or "next week sometime"
- If they need to cancel or reschedule, politely explain they'll need to call back during business hours
```

### Step 4: Industry-Specific Templates

#### Hair Salon Template
```javascript
const hairSalonConfig = {
  businessName: "Glamour Hair Studio",
  services: [
    "haircut", "color", "highlights", "balayage",
    "blowout", "keratin treatment", "extensions"
  ],
  averageDuration: {
    "haircut": 45,
    "color": 120,
    "highlights": 150,
    "balayage": 180
  },
  prompts: {
    greeting: "Thanks for calling Glamour Hair Studio! I can help you book your next appointment. Are you looking for a cut, color, or another service today?",
    stylistPreference: "Do you have a preferred stylist, or would you like me to check who's available?"
  }
};
```

#### Medical Office Template
```javascript
const medicalConfig = {
  businessName: "Family Health Clinic",
  appointmentTypes: [
    "routine checkup", "sick visit", "follow-up",
    "physical exam", "vaccination"
  ],
  requiredInfo: {
    insurance: true,
    dateOfBirth: true,
    reasonForVisit: true
  },
  prompts: {
    greeting: "Thank you for calling Family Health Clinic. I can help schedule your appointment. Are you a current patient with us?",
    newPatient: "Welcome! For new patients, we'll need about 30 minutes for your first visit. What's the reason for your visit today?"
  }
};
```

## 🔧 Advanced Configuration

### Custom Business Hours
```javascript
const businessHours = {
  monday: { open: "9:00", close: "18:00" },
  tuesday: { open: "9:00", close: "18:00" },
  wednesday: { open: "9:00", close: "18:00" },
  thursday: { open: "9:00", close: "20:00" },
  friday: { open: "9:00", close: "17:00" },
  saturday: { open: "10:00", close: "16:00" },
  sunday: null // Closed
};
```

### Handling Special Cases

#### Multi-Service Appointments
```javascript
// When someone books multiple services
if (services.length > 1) {
  const totalDuration = services.reduce((sum, service) => 
    sum + serviceDurations[service], 0
  );
  // Book extended appointment slot
}
```

#### Group Bookings
```javascript
// For businesses that handle group appointments
const groupBooking = {
  primaryContact: customerName,
  totalPeople: groupSize,
  specialRequests: notes
};
```

## 📊 Testing Your Integration

### Test Scenarios

1. **Basic Booking Flow**
   - "I'd like to book an appointment"
   - "What times do you have tomorrow?"
   - "2 PM works great"
   - Provide name and phone

2. **Natural Language Variations**
   - "Do you have anything next Monday morning?"
   - "I need an appointment sometime next week"
   - "What about Thursday afternoon?"

3. **Edge Cases**
   - Asking for unavailable times
   - Trying to book outside business hours
   - Multiple services
   - Cancellation requests

### Monitoring & Analytics

Track these metrics:
- Successful bookings vs attempts
- Average call duration
- Most requested times
- Drop-off points in conversation

## 🚀 Go Live Checklist

- [ ] JWT token configured
- [ ] Webhook endpoint deployed
- [ ] Vapi assistant configured
- [ ] Test calls completed
- [ ] Business hours set correctly
- [ ] Service durations configured
- [ ] Confirmation messages tested
- [ ] Error handling verified

## 💡 Pro Tips

1. **Keep responses short**: Voice conversations should be concise
2. **Confirm details**: Always repeat back important information
3. **Handle errors gracefully**: "I'm having trouble with that time, let me check another option"
4. **Be conversational**: Use natural language, not robotic responses
5. **Offer alternatives**: If first choice isn't available, immediately suggest others

## 🆘 Troubleshooting

### Common Issues

**"No appointments available"**
- Check JWT token is valid
- Verify business hours configuration
- Ensure Google Calendar is not fully booked

**"Cannot understand date/time"**
- Add more natural language examples
- Test with various formats
- Log failed parsing attempts

**"Booking fails"**
- Check API endpoint is accessible
- Verify all required fields are collected
- Test calendar permissions

## 📞 Support

Need help? Contact TheChattyAI support:
- Email: support@thechattyai.com
- Docs: docs.thechattyai.com
- Status: status.thechattyai.com

---

**Ready to revolutionize your appointment booking? Get started in 5 minutes!** 