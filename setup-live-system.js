const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 THECHATTYAI LIVE SYSTEM SETUP');
console.log('=================================\n');

console.log('This will set up:');
console.log('✅ Real Google Calendar booking on richard.gallagherxyz@gmail.com');
console.log('✅ SMS alerts to 7027760084');
console.log('✅ SMS confirmations to customers\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
    console.log('Creating .env file...');
    fs.writeFileSync('.env', '');
}

// Read existing .env
let envContent = fs.readFileSync('.env', 'utf8');

function updateEnv(key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
        envContent += `\n${key}=${value}`;
    }
}

async function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setup() {
    console.log('\n📱 TWILIO SETUP (for SMS alerts)');
    console.log('Go to https://console.twilio.com/\n');
    
    const twilioSid = await question('Enter your Twilio Account SID: ');
    const twilioToken = await question('Enter your Twilio Auth Token: ');
    const twilioPhone = await question('Enter your Twilio Phone Number (with +1): ');
    
    updateEnv('TWILIO_ACCOUNT_SID', twilioSid);
    updateEnv('TWILIO_AUTH_TOKEN', twilioToken);
    updateEnv('TWILIO_FROM_NUMBER', twilioPhone);
    
    console.log('\n📅 GOOGLE CALENDAR SETUP');
    
    // Check if credentials exist
    if (fs.existsSync('credentials.json') && fs.existsSync('token.json')) {
        console.log('✅ Google credentials found!');
        
        const creds = fs.readFileSync('credentials.json', 'utf8');
        const token = fs.readFileSync('token.json', 'utf8');
        
        updateEnv('GOOGLE_CREDENTIALS', creds.replace(/\n/g, ''));
        updateEnv('GOOGLE_TOKEN', token.replace(/\n/g, ''));
    } else {
        console.log('⚠️  Google credentials not found. You need to:');
        console.log('1. Run: node google-oauth-diagnostic.js');
        console.log('2. Follow the setup instructions');
    }
    
    // JWT Secret
    const crypto = require('crypto');
    const jwtSecret = crypto.randomBytes(32).toString('base64');
    updateEnv('JWT_SECRET', jwtSecret);
    
    // Write .env file
    fs.writeFileSync('.env', envContent.trim());
    
    console.log('\n✅ SETUP COMPLETE!\n');
    console.log('🎯 NEXT STEPS:');
    console.log('1. Run: npm start');
    console.log('2. Your server will be live with:');
    console.log('   - Real calendar booking on richard.gallagherxyz@gmail.com');
    console.log('   - SMS alerts to 7027760084');
    console.log('   - Customer SMS confirmations');
    console.log('\n3. Update Vapi webhook URL to:');
    console.log('   http://localhost:4000/vapi');
    console.log('\n4. Test by calling your AI and booking an appointment!');
    
    rl.close();
}

setup().catch(console.error); 