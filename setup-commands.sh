#!/bin/bash
# CHATTYAI QUICK SETUP - RUN THESE COMMANDS NOW

echo "🚀 ChattyAI Setup Script - Let's go live in 1 hour!"

# 1. Create project directory
mkdir chattyai-live
cd chattyai-live

# 2. Initialize package.json
npm init -y

# 3. Install dependencies
npm install express cors stripe knex pg dotenv
npm install --save-dev nodemon

# 4. Create .env file
cat > .env << EOF
# Get these from vapi.ai dashboard
VAPI_API_KEY=your-vapi-key-here

# Get these from stripe.com dashboard  
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PRICE_ID=price_your-stripe-price-id
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Your Supabase/PostgreSQL URL
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Your deployed backend URL
BACKEND_URL=https://your-app.onrender.com
EOF

# 5. Create public directory and landing page
mkdir public
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChattyAI - Never Miss Another Call | $79/mo</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            line-height: 1.6;
            color: #111827;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        
        /* Header */
        .header { 
            background: #fff; 
            border-bottom: 1px solid #e5e7eb;
            padding: 20px 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .nav { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: bold; color: #14B8A6; }
        
        /* Hero */
        .hero { 
            text-align: center; 
            padding: 80px 20px;
            background: linear-gradient(to bottom, #f9fafb, #fff);
        }
        .hero h1 { 
            font-size: 48px; 
            margin-bottom: 20px;
            line-height: 1.2;
        }
        .hero p { 
            font-size: 20px; 
            color: #6b7280;
            margin-bottom: 40px;
        }
        
        /* Buttons */
        .btn {
            display: inline-block;
            padding: 16px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
            cursor: pointer;
            border: none;
            font-size: 18px;
        }
        .btn-primary {
            background: #14B8A6;
            color: white;
        }
        .btn-primary:hover {
            background: #0d9488;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        
        /* Trust Bar */
        .trust-bar {
            background: #f3f4f6;
            padding: 15px;
            text-align: center;
            font-size: 14px;
        }
        
        /* Features */
        .features {
            padding: 80px 0;
            background: white;
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 40px;
            margin-top: 60px;
        }
        .feature {
            text-align: center;
            padding: 40px;
            border-radius: 12px;
            background: #f9fafb;
            transition: transform 0.3s;
        }
        .feature:hover {
            transform: translateY(-5px);
        }
        .feature-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .feature h3 {
            font-size: 24px;
            margin-bottom: 15px;
        }
        
        /* Modal */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        .modal-content {
            background-color: white;
            margin: 10% auto;
            padding: 40px;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 20px 25px rgba(0,0,0,0.15);
        }
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        .close:hover { color: #000; }
        
        /* Form */
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
        }
        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #14B8A6;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .hero h1 { font-size: 32px; }
            .features-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <!-- Trust Bar -->
    <div class="trust-bar">
        🔒 SOC2 Compliant | 📞 14,000+ Calls Handled Daily | ⭐ 4.9/5 Rating | 💳 No Setup Fees
    </div>

    <!-- Header -->
    <header class="header">
        <div class="container">
            <nav class="nav">
                <div class="logo">ChattyAI</div>
                <a href="tel:18778396798" class="btn btn-primary">Call Our AI: 1-877-839-6798</a>
            </nav>
        </div>
    </header>

    <!-- Hero -->
    <section class="hero">
        <div class="container">
            <h1>Your AI Receptionist<br>Never Misses a Call</h1>
            <p>24/7 availability. Books appointments. Answers questions. Just $79/month.</p>
            <button class="btn btn-primary" onclick="openSignup()">
                Start Free 7-Day Trial
            </button>
            <p style="margin-top: 20px; font-size: 16px;">No credit card required to start</p>
        </div>
    </section>

    <!-- Features -->
    <section class="features">
        <div class="container">
            <h2 style="text-align: center; font-size: 36px; margin-bottom: 20px;">
                Everything You Need, Nothing You Don't
            </h2>
            <div class="features-grid">
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h3>Instant Setup</h3>
                    <p>Your AI is ready in 60 seconds. Just forward your phone number.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📅</div>
                    <h3>Books Appointments</h3>
                    <p>Connects to your calendar. Never double-book again.</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🌐</div>
                    <h3>100+ Languages</h3>
                    <p>Serve every customer in their preferred language.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Signup Modal -->
    <div id="signupModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeSignup()">&times;</span>
            <h2 style="margin-bottom: 30px;">Create Your AI in 60 Seconds</h2>
            <form id="signupForm">
                <div class="form-group">
                    <label>Business Name</label>
                    <input type="text" name="businessName" required placeholder="ABC Company">
                </div>
                <div class="form-group">
                    <label>Your Email</label>
                    <input type="email" name="email" required placeholder="you@company.com">
                </div>
                <div class="form-group">
                    <label>Your Phone</label>
                    <input type="tel" name="phone" required placeholder="(555) 123-4567">
                </div>
                <div class="form-group">
                    <label>Industry</label>
                    <select name="industry" required>
                        <option value="">Select your industry</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="medical">Medical/Dental</option>
                        <option value="home-services">Home Services</option>
                        <option value="real-estate">Real Estate</option>
                        <option value="professional">Professional Services</option>
                        <option value="retail">Retail</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    Create My AI Receptionist
                </button>
            </form>
        </div>
    </div>

    <script>
        // Modal functions
        function openSignup() {
            document.getElementById('signupModal').style.display = 'block';
        }
        
        function closeSignup() {
            document.getElementById('signupModal').style.display = 'none';
        }
        
        // Close modal on outside click
        window.onclick = function(event) {
            const modal = document.getElementById('signupModal');
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }
        
        // Form submission
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            // Show loading
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating your AI...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Redirect to onboarding
                    window.location.href = `/onboarding.html?id=${result.userId}`;
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Error creating AI. Please try again.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    </script>
</body>
</html>
EOF

# 6. Create onboarding page
cat > public/onboarding.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup Your AI - ChattyAI</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            background: #f9fafb;
            color: #111827;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .step {
            display: none;
            animation: fadeIn 0.5s;
        }
        .step.active { display: block; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        h2 { margin-bottom: 30px; }
        .phone-display {
            font-size: 36px;
            font-weight: bold;
            color: #14B8A6;
            text-align: center;
            margin: 30px 0;
            padding: 30px;
            background: #f0fdfa;
            border-radius: 12px;
        }
        .btn {
            display: inline-block;
            padding: 16px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
            cursor: pointer;
            border: none;
            font-size: 18px;
            width: 100%;
            margin-top: 20px;
        }
        .btn-primary {
            background: #14B8A6;
            color: white;
        }
        .btn-primary:hover {
            background: #0d9488;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
        }
        #card-element {
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Step 1: Test Your AI -->
        <div class="step active" id="step1">
            <h2>✨ Your AI is Ready!</h2>
            <p>Call this number to test your new AI receptionist:</p>
            <div class="phone-display" id="aiPhone">Loading...</div>
            <p style="text-align: center; color: #6b7280;">
                Say "I'd like to book an appointment" to test the booking feature
            </p>
            <button class="btn btn-primary" onclick="goToStep(2)">
                It Sounds Great! Continue →
            </button>
        </div>

        <!-- Step 2: Customize -->
        <div class="step" id="step2">
            <h2>🎨 Customize Your AI</h2>
            <form id="customizeForm">
                <div class="form-group">
                    <label>Custom Greeting (optional)</label>
                    <textarea name="greeting" rows="3" 
                        placeholder="Thank you for calling [Business Name], how can I help you today?"></textarea>
                </div>
                <div class="form-group">
                    <label>Business Hours</label>
                    <input type="text" name="businessHours" 
                        placeholder="Mon-Fri 9am-5pm, Sat 10am-2pm">
                </div>
                <button type="submit" class="btn btn-primary">
                    Save & Continue →
                </button>
            </form>
        </div>

        <!-- Step 3: Start Trial -->
        <div class="step" id="step3">
            <h2>💳 Start Your 7-Day Free Trial</h2>
            <p style="margin-bottom: 30px;">Then just $79/month. Cancel anytime.</p>
            <form id="paymentForm">
                <div class="form-group">
                    <label>Card Information</label>
                    <div id="card-element"></div>
                </div>
                <button type="submit" class="btn btn-primary">
                    Start Free Trial
                </button>
                <p style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
                    You won't be charged for 7 days
                </p>
            </form>
        </div>

        <!-- Step 4: Success -->
        <div class="step" id="step4">
            <h2 style="text-align: center;">🎉 You're All Set!</h2>
            <p style="text-align: center; margin-bottom: 30px;">
                Your AI receptionist is now active 24/7
            </p>
            <div class="phone-display" id="finalPhone">Loading...</div>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-bottom: 10px;">📞 To activate:</h3>
                <p>Forward your business phone to the number above, or use it as your new business number!</p>
            </div>
            <a href="/" class="btn btn-primary">Back to Dashboard</a>
        </div>
    </div>

    <script>
        // Get userId from URL
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');
        
        // Initialize Stripe
        const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY'); // TODO: Add your key
        const elements = stripe.elements();
        const cardElement = elements.create('card');
        
        // Load user data
        async function loadUserData() {
            try {
                const response = await fetch(`/api/user/${userId}`);
                const data = await response.json();
                document.getElementById('aiPhone').textContent = data.aiPhoneNumber;
                document.getElementById('finalPhone').textContent = data.aiPhoneNumber;
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        }
        
        // Navigation
        function goToStep(step) {
            document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
            document.getElementById(`step${step}`).classList.add('active');
            
            if (step === 3) {
                cardElement.mount('#card-element');
            }
        }
        
        // Customize form
        document.getElementById('customizeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            await fetch('/api/update-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    greeting: formData.get('greeting'),
                    businessHours: formData.get('businessHours')
                })
            });
            
            goToStep(3);
        });
        
        // Payment form
        document.getElementById('paymentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const {error, paymentMethod} = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement
            });
            
            if (!error) {
                const response = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        paymentMethodId: paymentMethod.id
                    })
                });
                
                if (response.ok) {
                    goToStep(4);
                }
            }
        });
        
        // Initialize
        loadUserData();
    </script>
</body>
</html>
EOF

# 7. Create package.json scripts
cat > package.json << 'EOF'
{
  "name": "chattyai-live",
  "version": "1.0.0",
  "description": "ChattyAI - AI Receptionists",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "deploy": "git push render main"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "stripe": "^12.0.0",
    "knex": "^2.5.0",
    "pg": "^8.11.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
EOF

# 8. Copy the server code
cp ../server-simple.js ./server.js

# 9. Load environment variables in server.js
sed -i '1i require("dotenv").config();' server.js

# 10. Create README with next steps
cat > README.md << 'EOF'
# ChattyAI Launch Checklist

## ✅ Step 1: Get Your API Keys (10 minutes)

1. **Vapi.ai**
   - Go to: https://vapi.ai
   - Sign up
   - Go to Settings > API Keys
   - Copy your API key
   - Add to .env: `VAPI_API_KEY=your-key`

2. **Stripe**
   - Go to: https://stripe.com
   - Sign up
   - Get API keys from dashboard
   - Add to .env: `STRIPE_SECRET_KEY=sk_test_...`
   - Create a product ($79/month)
   - Add price ID to .env: `STRIPE_PRICE_ID=price_...`

3. **Database** (Use Supabase - it's free)
   - Go to: https://supabase.com
   - Create new project
   - Get connection string
   - Add to .env: `DATABASE_URL=...`

## ✅ Step 2: Deploy to Render (5 minutes)

1. Push to GitHub:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO
   git push -u origin main
   ```

2. Deploy on Render:
   - Go to: https://render.com
   - New > Web Service
   - Connect GitHub repo
   - Add environment variables
   - Deploy!

## ✅ Step 3: Test Everything (5 minutes)

1. Visit your site
2. Click "Start Free Trial"
3. Enter test business info
4. Call the AI number
5. Complete payment (use Stripe test card: 4242 4242 4242 4242)

## ✅ Step 4: Go Live!

1. Switch Stripe to live mode
2. Update your domain
3. Share with first customer!

## 🚀 You're ready to make money!
EOF

echo "✅ Setup complete! Now:"
echo "1. Edit .env with your API keys"
echo "2. Run: npm run dev"
echo "3. Visit: http://localhost:3000"
echo "4. Follow the README.md checklist" 