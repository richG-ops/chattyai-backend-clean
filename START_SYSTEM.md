# 🚀 START YOUR COMPLETE SYSTEM - STEP BY STEP

## ✅ **BACKEND IS ALREADY RUNNING ON PORT 4000**

## 🎯 **NOW LET'S GET FRONTEND RUNNING:**

### **Step 1: Create Frontend Environment File**

Open a new PowerShell terminal and run:

```powershell
# Navigate to frontend directory
cd thechattyai-frontend

# Create .env.local file
@"
# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Calendar API Configuration - CRITICAL: Use correct URL
CALENDAR_API_URL=http://localhost:4000
CALENDAR_API_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFiYTE2OGRkMzBjMDM3N2MxZjBjNzRiOTM2ZjQyNzQiLCJpYXQiOjE3NTIwMDgzNjcsImV4cCI6MTc4MzU0NDM2N30.zelpVbu-alSaAfMSkSsne2gaaWETqdbakzui5Pbi_Ts

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Production URLs (for deployment)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
"@ | Out-File -FilePath .env.local -Encoding utf8
```

### **Step 2: Install & Start Frontend**

```powershell
# Install dependencies (if not done)
npm install

# Start the frontend
npm run dev
```

### **Step 3: Access Your System**

Once running, you'll have:

- **🔧 Backend API:** http://localhost:4000 (already running)
- **🎨 Frontend App:** http://localhost:3000 (starting now)

### **Step 4: Test Complete Flow**

1. **Open Browser:** http://localhost:3000
2. **Click:** "Get Started Free"
3. **Fill:** Business onboarding form
4. **Login:** demo@business.com (no password)
5. **View:** Real-time dashboard

## 🔍 **TROUBLESHOOTING:**

### **If Frontend Won't Start:**

```powershell
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache clean --force
npm install
npm run dev
```

### **If Port 3000 is Busy:**

```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Or use a different port
npm run dev -- -p 3001
```

### **If TypeScript Errors:**

The configuration is set to ignore TypeScript errors for now. This is intentional to get you running quickly.

## ✅ **SUCCESS CHECKLIST:**

- [ ] Backend running on port 4000 ✅
- [ ] Frontend .env.local created
- [ ] Frontend npm install completed
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000
- [ ] Can complete onboarding flow
- [ ] Dashboard shows real data

## 🎉 **YOUR COMPLETE SYSTEM ARCHITECTURE:**

```
📱 Frontend (localhost:3000)
    ↓ API calls with JWT
🔧 Backend (localhost:4000) 
    ↓ OAuth integration
📅 Google Calendar API
```

**BOTH SERVICES MUST RUN SIMULTANEOUSLY FOR THE SYSTEM TO WORK!** 