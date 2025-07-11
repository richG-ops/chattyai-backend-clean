require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const cors = require('cors');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const knex = require('knex');
const fs = require('fs'); // Added for Google Calendar credentials

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection (optional)
let db = null;
if (process.env.DATABASE_URL) {
    db = knex({
        client: 'pg',
        connection: process.env.DATABASE_URL
    });
}

// Create users table if not exists
if (db) {
    db.schema.hasTable('users').then(exists => {
        if (!exists) {
            return db.schema.createTable('users', table => {
                table.increments('id');
                table.string('business_name');
                table.string('email').unique();
                table.string('phone');
                table.string('industry');
                table.string('status').defaultTo('trial');
                table.string('stripe_customer_id');
                table.string('vapi_assistant_id');
                table.string('ai_phone_number');
                table.string('subscription_id');
                table.timestamps(true, true);
            });
        }
    });
}


// VAPI.AI Helper Functions
async function createVapiAssistant(businessName, industry) {
    const response = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: `${businessName} AI Receptionist`,
            firstMessage: `Thank you for calling ${businessName}! How can I help you today?`,
            model: "gpt-4",
            voice: "luna",
            transcriber: {
                provider: "deepgram",
                model: "nova-2",
                language: "en"
            },
            model: {
                provider: "openai",
                model: "gpt-4",
                temperature: 0.7,
                systemPrompt: `You are a professional receptionist for ${businessName}, a ${industry} business. 
                              Be friendly, helpful, and professional. Answer questions, book appointments, 
                              and provide information about the business.`
            },
            forwardingPhoneNumber: null,
            endCallFunctionEnabled: true
        })
    });
    
    return await response.json();
}

async function buyPhoneNumber(assistantId) {
    const response = await fetch('https://api.vapi.ai/phone-number', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            provider: "twilio",
            numberType: "local",
            areaCode: "702",
            assistantId: assistantId
        })
    });
    
    const data = await response.json();
    return data.number;
}

// ENDPOINTS

// 1. Quick Signup - Creates AI immediately
app.post('/api/signup', async (req, res) => {
    try {
        const { businessName, phone, email, industry } = req.body;
        
        // Create user
        if (!db) {
            return res.status(500).json({ error: 'Database not configured' });
        }
        const [user] = await db('users').insert({
            business_name: businessName,
            email,
            phone,
            industry,
            status: 'trial'
        }).returning('*');
        
        // Create Stripe customer
        if (stripe) {
            const customer = await stripe.customers.create({
                email,
                name: businessName,
                metadata: { 
                    userId: user.id,
                    businessName 
                }
            });
            
            // Create AI Assistant
            const assistant = await createVapiAssistant(businessName, industry);
            
            // Get phone number
            const phoneNumber = await buyPhoneNumber(assistant.id);
            
            // Update user with details
            await db('users').where({ id: user.id }).update({
                stripe_customer_id: customer.id,
                vapi_assistant_id: assistant.id,
                ai_phone_number: phoneNumber
            });
        } else {
            // If Stripe is not configured, just create the AI assistant
            const assistant = await createVapiAssistant(businessName, industry);
            const phoneNumber = await buyPhoneNumber(assistant.id);
            await db('users').where({ id: user.id }).update({
                vapi_assistant_id: assistant.id,
                ai_phone_number: phoneNumber
            });
        }
        
        res.json({ 
            success: true,
            userId: user.id,
            aiPhoneNumber: user.ai_phone_number,
            message: 'AI created! Call to test it.'
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(400).json({ error: error.message });
    }
});

// 2. Start subscription
app.post('/api/subscribe', async (req, res) => {
    try {
        const { userId, paymentMethodId } = req.body;
        
        if (!db) {
            return res.status(500).json({ error: 'Database not configured' });
        }

        const user = await db('users').where({ id: userId }).first();
        
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }

        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: user.stripe_customer_id,
        });
        
        // Set as default payment method
        await stripe.customers.update(user.stripe_customer_id, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
        
        // Create subscription with 7-day trial
        const subscription = await stripe.subscriptions.create({
            customer: user.stripe_customer_id,
            items: [{
                price: process.env.STRIPE_PRICE_ID || 'price_chattyai_79'
            }],
            trial_period_days: 7,
            metadata: {
                userId: user.id
            }
        });
        
        // Update user status
        await db('users').where({ id: userId }).update({
            status: 'active',
            subscription_id: subscription.id
        });
        
        res.json({ 
            success: true,
            message: 'Trial started! Your AI is now active.'
        });
        
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(400).json({ error: error.message });
    }
});

// 3. Update AI settings
app.post('/api/update-ai', async (req, res) => {
    try {
        const { userId, greeting, businessHours } = req.body;
        
        if (!db) {
            return res.status(500).json({ error: 'Database not configured' });
        }

        const user = await db('users').where({ id: userId }).first();
        
        // Update assistant in Vapi
        if (process.env.VAPI_API_KEY) {
            await fetch(`https://api.vapi.ai/assistant/${user.vapi_assistant_id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstMessage: greeting || undefined,
                    model: {
                        systemPrompt: user.model?.systemPrompt + 
                                     `\nBusiness hours: ${businessHours}`
                    }
                })
            });
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Update error:', error);
        res.status(400).json({ error: error.message });
    }
});

// 4. Get user details
app.get('/api/user/:userId', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ error: 'Database not configured' });
        }
        const user = await db('users')
            .where({ id: req.params.userId })
            .first();
            
        res.json({
            businessName: user.business_name,
            aiPhoneNumber: user.ai_phone_number,
            status: user.status
        });
        
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 5. Webhook for Vapi events
app.post('/api/vapi-webhook', async (req, res) => {
    const { type, call, assistant } = req.body;
    
    if (type === 'call-ended') {
        // Log call details
        console.log('Call ended:', {
            duration: call.duration,
            assistantId: assistant.id,
            recording: call.recordingUrl
        });
        
        // Could save to database for analytics
    }
    
    res.json({ received: true });
});

// 6. Stripe webhook
app.post('/api/stripe-webhook', async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
        req.body, 
        sig, 
        process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
        case 'customer.subscription.deleted':
            // Handle cancellation
            const subscription = event.data.object;
            if (db) {
                await db('users')
                    .where({ subscription_id: subscription.id })
                    .update({ status: 'cancelled' });
            }
            break;
    }
    
    res.json({ received: true });
});

// 7. VAPI Calendar Integration Endpoint - LIVE VERSION
const { google } = require('googleapis');
const twilio = require('twilio');

// Initialize Twilio (you'll need to add these to your .env)
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID',
    process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN'
);
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '+1XXXXXXXXXX';

// Initialize Google Calendar
let calendar;
try {
    // Load Google credentials
    let GOOGLE_CREDENTIALS, GOOGLE_TOKEN;
    
    // Try to load from environment first, then from files
    if (process.env.GOOGLE_CREDENTIALS) {
        GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        console.log('✅ Google credentials loaded from environment');
    } else if (fs.existsSync('credentials.json')) {
        GOOGLE_CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json'));
        console.log('✅ Google credentials loaded from file');
    }
    
    if (process.env.GOOGLE_TOKEN) {
        GOOGLE_TOKEN = JSON.parse(process.env.GOOGLE_TOKEN);
        console.log('✅ Google token loaded from environment');
    } else if (fs.existsSync('token.json')) {
        GOOGLE_TOKEN = JSON.parse(fs.readFileSync('token.json'));
        console.log('✅ Google token loaded from file');
    }
    
    if (GOOGLE_CREDENTIALS && GOOGLE_TOKEN) {
        const { client_secret, client_id, redirect_uris } = GOOGLE_CREDENTIALS.web || GOOGLE_CREDENTIALS.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(GOOGLE_TOKEN);
        
        calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        console.log('✅ Google Calendar initialized for LIVE bookings');
    } else {
        console.log('⚠️ Google Calendar not configured - will use fallback mode');
    }
} catch (error) {
    console.error('❌ Google Calendar initialization error:', error.message);
    console.log('⚠️ Will use SMS-only mode for bookings');
}

// Send SMS function
async function sendSMS(to, message) {
    try {
        if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'YOUR_TWILIO_ACCOUNT_SID') {
            console.log('📱 SMS SIMULATION (Twilio not configured):');
            console.log(`TO: ${to}`);
            console.log(`MESSAGE: ${message}`);
            console.log('---');
            return true;
        }
        
        const result = await twilioClient.messages.create({
            body: message,
            from: TWILIO_FROM_NUMBER,
            to: to
        });
        console.log('✅ SMS sent:', result.sid);
        return true;
    } catch (error) {
        console.error('❌ SMS error:', error);
        return false;
    }
}

// Parse natural language date/time
function parseDateTime(date, time) {
    const today = new Date();
    let targetDate = new Date();
    
    // Parse date
    if (date.toLowerCase().includes('today')) {
        targetDate = today;
    } else if (date.toLowerCase().includes('tomorrow')) {
        targetDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else {
        // Try to parse as date
        targetDate = new Date(date);
    }
    
    // Parse time (e.g., "2 PM", "14:00", "2:30 PM")
    const timeMatch = time.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
    if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3]?.toLowerCase();
        
        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        
        targetDate.setHours(hours, minutes, 0, 0);
    }
    
    return targetDate;
}

app.post('/vapi', async (req, res) => {
    const { function: functionName, parameters } = req.body;
    
    try {
        switch(functionName) {
            case 'checkAvailability':
                if (!calendar) {
                    return res.json({
                        success: true,
                        message: "I have openings tomorrow at 10 AM, 2 PM, and 4 PM. Which works best for you?",
                        slots: []
                    });
                }
                
                // Real availability check
                const now = new Date();
                const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                
                const freebusy = await calendar.freebusy.query({
                    requestBody: {
                        timeMin: now.toISOString(),
                        timeMax: weekLater.toISOString(),
                        items: [{ id: 'richard.gallagherxyz@gmail.com' }]
                    }
                });
                
                const busy = freebusy.data.calendars['richard.gallagherxyz@gmail.com'].busy || [];
                const availableSlots = [];
                
                // Find available slots
                for (let d = 0; d < 7; d++) {
                    const checkDate = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
                    
                    // Business hours: 9 AM - 5 PM
                    for (let hour = 9; hour < 17; hour++) {
                        const slotStart = new Date(checkDate);
                        slotStart.setHours(hour, 0, 0, 0);
                        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                        
                        // Check if slot is free
                        const isBusy = busy.some(b => 
                            new Date(b.start) < slotEnd && new Date(b.end) > slotStart
                        );
                        
                        if (!isBusy && slotStart > now) {
                            availableSlots.push({
                                start: slotStart.toISOString(),
                                end: slotEnd.toISOString(),
                                display: slotStart.toLocaleString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    hour12: true
                                })
                            });
                        }
                        
                        if (availableSlots.length >= 5) break;
                    }
                    if (availableSlots.length >= 5) break;
                }
                
                if (availableSlots.length > 0) {
                    const slotList = availableSlots.slice(0, 3).map(s => s.display).join(', ');
                    res.json({
                        success: true,
                        message: `I have availability at: ${slotList}. Which time works best for you?`,
                        slots: availableSlots
                    });
                } else {
                    res.json({
                        success: true,
                        message: "I'm fully booked this week, but I can check next week for you. Would that work?",
                        slots: []
                    });
                }
                break;
                
            case 'bookAppointment':
                const { date, time, customerName, customerPhone, serviceType } = parameters;
                
                // Parse the date and time
                const appointmentDate = parseDateTime(date, time);
                const endDate = new Date(appointmentDate.getTime() + 60 * 60 * 1000); // 1 hour appointment
                
                if (!calendar) {
                    // Fallback if calendar not configured
                    const confirmationNumber = `BOOK-${Date.now()}`;
                    
                    // Send SMS alerts
                    await sendSMS('7027760084', 
                        `🚨 NEW BOOKING!\n${customerName}\n${customerPhone}\nService: ${serviceType}\nDate: ${appointmentDate.toLocaleString()}`
                    );
                    
                    if (customerPhone) {
                        await sendSMS(customerPhone,
                            `Hi ${customerName}! Your appointment is confirmed for ${appointmentDate.toLocaleString()}. Confirmation: ${confirmationNumber}`
                        );
                    }
                    
                    return res.json({
                        success: true,
                        message: `Perfect ${customerName}! I've booked your ${serviceType} appointment for ${appointmentDate.toLocaleString()}. You'll receive a confirmation text shortly.`,
                        confirmationNumber,
                        details: {
                            customerName,
                            date: appointmentDate.toISOString(),
                            time: time,
                            service: serviceType
                        }
                    });
                }
                
                // Book on real calendar
                const event = {
                    summary: `${serviceType || 'Appointment'} - ${customerName}`,
                    description: `Customer: ${customerName}\nPhone: ${customerPhone}\nService: ${serviceType}\nBooked via TheChattyAI`,
                    start: {
                        dateTime: appointmentDate.toISOString(),
                        timeZone: 'America/New_York'
                    },
                    end: {
                        dateTime: endDate.toISOString(),
                        timeZone: 'America/New_York'
                    },
                    attendees: [
                        { email: 'richard.gallagherxyz@gmail.com' }
                    ],
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'email', minutes: 60 },
                            { method: 'popup', minutes: 30 }
                        ]
                    }
                };
                
                const calendarResult = await calendar.events.insert({
                    calendarId: 'richard.gallagherxyz@gmail.com',
                    resource: event
                });
                
                const confirmationNumber = calendarResult.data.id;
                
                // Send SMS to Richard
                await sendSMS('7027760084', 
                    `🚨 NEW BOOKING ALERT!\n\nCustomer: ${customerName}\nPhone: ${customerPhone}\nService: ${serviceType}\nTime: ${appointmentDate.toLocaleString()}\n\nCalendar event created!`
                );
                
                // Send SMS to customer
                if (customerPhone) {
                    await sendSMS(customerPhone,
                        `Hi ${customerName}! Your ${serviceType} appointment is confirmed for ${appointmentDate.toLocaleString()}.\n\nConfirmation: ${confirmationNumber}\n\nWe'll see you then!\n\n- TheChattyAI`
                    );
                }
                
                res.json({
                    success: true,
                    message: `Excellent ${customerName}! I've booked your ${serviceType} appointment for ${appointmentDate.toLocaleString()}. You'll receive a confirmation text at ${customerPhone} shortly.`,
                    confirmationNumber,
                    details: {
                        customerName,
                        date: appointmentDate.toISOString(),
                        time: time,
                        service: serviceType,
                        calendarLink: calendarResult.data.htmlLink
                    }
                });
                break;
                
            default:
                res.json({ 
                    error: 'Unknown function',
                    message: 'I couldn\'t process that request'
                });
        }
    } catch (error) {
        console.error('Vapi error:', error);
        
        // Still try to send alert on error
        await sendSMS('7027760084', 
            `⚠️ VAPI ERROR!\n${error.message}\nFunction: ${functionName}`
        );
        
        res.json({ 
            error: 'Service error',
            message: 'I apologize, I\'m having trouble with the booking system. Let me transfer you to someone who can help.'
        });
    }
});

// Serve static files
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ChattyAI running on port ${PORT}`);
}); 