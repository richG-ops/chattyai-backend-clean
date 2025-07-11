'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  Phone, 
  Calendar,
  Shield,
  ArrowRight,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SetupCompletePage() {
  const [businessName, setBusinessName] = useState('')
  const [jwtToken, setJwtToken] = useState('')
  const [clientId, setClientId] = useState('')
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isIntegrating, setIsIntegrating] = useState(false)
  const [integrationStep, setIntegrationStep] = useState(1)
  const router = useRouter()

  useEffect(() => {
    // Get business info from localStorage
    const name = localStorage.getItem('business_name') || 'Your Business'
    const token = localStorage.getItem('setup_token') || ''
    const id = localStorage.getItem('client_id') || ''
    
    setBusinessName(name)
    setJwtToken(token)
    setClientId(id)
  }, [])

  const handleGoogleIntegration = async () => {
    if (!googleCalendarEmail) {
      alert('Please enter your Google Calendar email')
      return
    }
    
    setIsIntegrating(true)
    
    // Simulate integration process
    setTimeout(() => {
      setIntegrationStep(2)
      localStorage.setItem('google_calendar_email', googleCalendarEmail)
    }, 2000)
  }

  const handlePhoneSetup = async () => {
    if (!phoneNumber) {
      alert('Please enter your business phone number')
      return
    }
    
    setIsIntegrating(true)
    
    // Simulate phone setup
    setTimeout(() => {
      setIntegrationStep(3)
      localStorage.setItem('business_phone', phoneNumber)
      
      // After final step, redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }, 2000)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background effects */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-20 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-light">TheChattyAI</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-5xl font-light mb-4">
            Welcome to TheChattyAI, <span className="text-cyan-400">{businessName}</span>!
          </h1>
          
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Your AI employees are ready. Let's connect your calendar and phone system.
          </p>
        </div>

        {/* Integration Steps */}
        <div className="space-y-6">
          {/* Step 1: Google Calendar */}
          <Card className={`border-0 backdrop-blur-xl transition-all duration-500 ${
            integrationStep === 1 
              ? 'bg-white/10 border border-white/20 scale-105' 
              : integrationStep > 1
              ? 'bg-white/5 border border-white/10 opacity-50'
              : 'bg-white/5 border border-white/10'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-6 h-6 text-cyan-400" />
                  <div>
                    <CardTitle className="text-white">Connect Google Calendar</CardTitle>
                    <CardDescription className="text-white/50">
                      Allow your AI to manage appointments
                    </CardDescription>
                  </div>
                </div>
                {integrationStep > 1 && (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
              </div>
            </CardHeader>
            {integrationStep === 1 && (
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="google-email" className="text-white/70">
                    Google Calendar Email
                  </Label>
                  <Input
                    id="google-email"
                    type="email"
                    placeholder="your-calendar@gmail.com"
                    value={googleCalendarEmail}
                    onChange={(e) => setGoogleCalendarEmail(e.target.value)}
                    className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
                
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                  <p className="text-sm text-cyan-300">
                    We'll send you authorization instructions to connect your calendar securely.
                  </p>
                </div>
                
                <Button
                  onClick={handleGoogleIntegration}
                  disabled={isIntegrating || !googleCalendarEmail}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                >
                  {isIntegrating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect Calendar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Step 2: Phone Number */}
          <Card className={`border-0 backdrop-blur-xl transition-all duration-500 ${
            integrationStep === 2 
              ? 'bg-white/10 border border-white/20 scale-105' 
              : integrationStep > 2
              ? 'bg-white/5 border border-white/10 opacity-50'
              : 'bg-white/5 border border-white/10 opacity-50'
          }`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Phone className="w-6 h-6 text-purple-400" />
                  <div>
                    <CardTitle className="text-white">Set Up Phone System</CardTitle>
                    <CardDescription className="text-white/50">
                      Configure your AI voice assistant
                    </CardDescription>
                  </div>
                </div>
                {integrationStep > 2 && (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
              </div>
            </CardHeader>
            {integrationStep === 2 && (
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="text-white/70">
                    Business Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
                
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-sm text-purple-300">
                    We'll provide you with a forwarding number to route calls through your AI assistant.
                  </p>
                </div>
                
                <Button
                  onClick={handlePhoneSetup}
                  disabled={isIntegrating || !phoneNumber}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                >
                  {isIntegrating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Configure Phone
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Step 3: Complete */}
          {integrationStep === 3 && (
            <Card className="border-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl border border-green-500/20">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-light text-white mb-2">
                  All Systems Active!
                </h3>
                
                <p className="text-white/60 mb-6">
                  Your AI employees are now online and ready to handle calls.
                </p>
                
                <div className="flex items-center justify-center space-x-2 text-green-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Redirecting to your dashboard...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* API Credentials (for developers) */}
        {integrationStep === 1 && (
          <Card className="mt-8 border-0 bg-white/5 backdrop-blur-xl border border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Developer Access</CardTitle>
              <CardDescription className="text-white/50">
                API credentials for custom integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white/70 text-sm">Client ID</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={clientId}
                    readOnly
                    className="bg-white/5 border-white/20 text-white/80 font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(clientId)}
                    className="text-white/50 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm">
                <Link href="/docs" className="text-cyan-400 hover:text-cyan-300 flex items-center">
                  View Documentation
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
                <Link href="/api-keys" className="text-cyan-400 hover:text-cyan-300 flex items-center">
                  Manage API Keys
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 