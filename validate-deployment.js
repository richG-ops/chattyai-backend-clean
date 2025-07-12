const fs = require('fs');
const path = require('path');

console.log('🔍 TheChattyAI Production Deployment Validator\n');

let errors = 0;
let warnings = 0;

function checkFile(filePath, required = true) {
    const exists = fs.existsSync(filePath);
    if (!exists && required) {
        console.error(`❌ Missing required file: ${filePath}`);
        errors++;
    } else if (!exists) {
        console.warn(`⚠️  Missing optional file: ${filePath}`);
        warnings++;
    } else {
        console.log(`✅ Found: ${filePath}`);
    }
    return exists;
}

function checkEnvVar(name, required = true) {
    const value = process.env[name];
    if (!value && required) {
        console.error(`❌ Missing required env var: ${name}`);
        errors++;
    } else if (!value) {
        console.warn(`⚠️  Missing optional env var: ${name}`);
        warnings++;
    } else {
        console.log(`✅ Set: ${name}`);
    }
    return !!value;
}

console.log('📁 Checking required files...\n');

// Check deployment files
checkFile('render.yaml');
checkFile('Dockerfile.api');
checkFile('Dockerfile.frontend');
checkFile('.github/workflows/deploy.yml');
checkFile('server-simple.js');
checkFile('package.json');
checkFile('package-lock.json');

// Check frontend files
checkFile('thechattyai-frontend/package.json');
checkFile('thechattyai-frontend/next.config.js');
checkFile('thechattyai-frontend/src/app/api/health/route.ts');

// Check for Google credentials (optional for local testing)
const hasGoogleCreds = checkFile('credentials.json', false);
const hasGoogleToken = checkFile('token.json', false);

console.log('\n🔐 Checking environment variables...\n');

// Check critical env vars
checkEnvVar('TWILIO_ACCOUNT_SID', false);
checkEnvVar('TWILIO_AUTH_TOKEN', false);
checkEnvVar('TWILIO_FROM_NUMBER', false);
checkEnvVar('VAPI_API_KEY', false);

// Check if running with production config
if (process.env.NODE_ENV === 'production') {
    checkEnvVar('DATABASE_URL');
    checkEnvVar('REDIS_URL', false);
    checkEnvVar('JWT_SECRET');
}

console.log('\n📋 Summary:\n');

if (errors === 0 && warnings === 0) {
    console.log('🎉 All checks passed! Ready for deployment.');
} else {
    console.log(`Found ${errors} errors and ${warnings} warnings.`);
    
    if (errors > 0) {
        console.log('\n❌ Please fix the errors before deploying.');
        process.exit(1);
    } else {
        console.log('\n⚠️  Warnings found but deployment can proceed.');
    }
}

console.log('\n🚀 Next steps:');
console.log('1. Commit all changes: git add . && git commit -m "Production ready"');
console.log('2. Push to GitHub: git push origin main');
console.log('3. Follow PRODUCTION_DEPLOYMENT_GUIDE.md');

if (!hasGoogleCreds || !hasGoogleToken) {
    console.log('\n📅 Google Calendar Setup:');
    console.log('- Run: node google-oauth-diagnostic.js');
    console.log('- Follow the authorization flow');
    console.log('- This will create credentials.json and token.json');
} 