'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Phone, CheckCircle, Sparkles, ArrowRight, Building, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    timeZone: 'America/New_York',
    googleCalendarEmail: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  })
  const router = useRouter()

  const totalSteps = 4
  const progressPercent = (currentStep / totalSteps) * 100

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      console.log('🚀 Starting account creation process...')
      
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match')
      }
      
      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters')
      }
      
      // Create real user account with Supabase
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'signup',
          email: formData.email,
          password: formData.password,
          fullName: formData.ownerName,
          companyName: formData.businessName
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create account')
      }

      const result = await response.json()
      
      console.log('✅ Account created successfully:', result)
      
      // Store user info in localStorage for immediate access
      if (result.user) {
        localStorage.setItem('user_id', result.user.id)
        localStorage.setItem('user_email', result.user.email)
        localStorage.setItem('business_name', formData.businessName)
        localStorage.setItem('owner_name', formData.ownerName)
      }
      
      // Create business profile in backend
      const profileResponse = await fetch('/api/clients/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: result.user.id,
          ...formData
        }),
      })

      if (!profileResponse.ok) {
        console.error('Profile creation failed, but account was created')
      }

      // Redirect to success page
      router.push('/setup-complete')
    } catch (error) {
      console.error('❌ Setup failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(`Setup failed: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

        const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.businessName && formData.businessType && formData.ownerName
      case 2:
        return formData.email && formData.phone && formData.password && formData.confirmPassword
      case 3:
        return true // Address is optional, timezone has default
      default:
        return false
    }
  }

  const businessTypes = [
    'Healthcare',
    'Beauty & Wellness',
    'Fitness & Sports',
    'Professional Services',
    'Education',
    'Real Estate',
    'Legal Services',
    'Financial Services',
    'Home Services',
    'Automotive',
    'Other'
  ]

  const timeZones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]

  return (
    <div className="min-h-screen bg-hero-gradient scroll-smooth">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex items-center justify-between animate-slideInLeft">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TheChattyAI</span>
          </div>
          <div className="flex items-center space-x-2 text-white">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">Setting up your AI agent</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Progress Header */}
          <div className="text-center mb-12 animate-fadeInUp">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Welcome to <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">TheChattyAI</span>
            </h1>
            <p className="text-xl text-blue-100 mb-6">
              Let's get your AI voice agent set up in just a few minutes
            </p>
            
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
                }`}>
                  {currentStep > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
                </div>
                <span className="text-white text-sm">Business Info</span>
              </div>
              <div className="w-8 h-0.5 bg-white/30"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
                }`}>
                  {currentStep > 2 ? <CheckCircle className="w-4 h-4" /> : '2'}
                </div>
                <span className="text-white text-sm">Contact Details</span>
              </div>
              <div className="w-8 h-0.5 bg-white/30"></div>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= 3 ? 'bg-white text-blue-600' : 'bg-white/20 text-white'
                }`}>
                  {currentStep > 3 ? <CheckCircle className="w-4 h-4" /> : '3'}
                </div>
                <span className="text-white text-sm">Setup Complete</span>
              </div>
            </div>
            
            <Progress value={progressPercent} className="w-full max-w-md mx-auto bg-white/20" />
          </div>

          {/* Form Card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm card-hover animate-fadeInUp">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-gray-800">
                {currentStep === 1 && (
                  <div className="flex items-center justify-center space-x-2">
                    <Building className="w-6 h-6 text-blue-600" />
                    <span>Tell us about your business</span>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="flex items-center justify-center space-x-2">
                    <User className="w-6 h-6 text-blue-600" />
                    <span>Your contact information</span>
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span>Final setup details</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Step 1: Business Information */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-slideInLeft">
                  <div>
                    <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                      Business Name *
                    </Label>
                    <Input
                      id="businessName"
                      placeholder="e.g., Sarah's Hair Salon"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className="mt-1 focus-premium"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessType" className="text-sm font-medium text-gray-700">
                      Business Type *
                    </Label>
                    <Select onValueChange={(value) => handleInputChange('businessType', value)}>
                      <SelectTrigger className="mt-1 focus-premium">
                        <SelectValue placeholder="Select your business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="ownerName" className="text-sm font-medium text-gray-700">
                      Owner Name *
                    </Label>
                    <Input
                      id="ownerName"
                      placeholder="Your full name"
                      value={formData.ownerName}
                      onChange={(e) => handleInputChange('ownerName', e.target.value)}
                      className="mt-1 focus-premium"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Business Description
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of your services..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="mt-1 focus-premium"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Contact Information */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-slideInLeft">
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="mt-1 focus-premium"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password * (min 8 characters)
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a secure password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="mt-1 focus-premium"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm Password *
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="mt-1 focus-premium"
                    />
                    {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="mt-1 focus-premium"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                      Business Address
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="123 Main St, City, State 12345"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="mt-1 focus-premium"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Final Setup */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-slideInLeft">
                  <div>
                    <Label htmlFor="timeZone" className="text-sm font-medium text-gray-700">
                      Time Zone *
                    </Label>
                    <Select 
                      value={formData.timeZone} 
                      onValueChange={(value) => handleInputChange('timeZone', value)}
                    >
                      <SelectTrigger className="mt-1 focus-premium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeZones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Your AI agent will be configured with your business information</li>
                      <li>• You'll get access to your personalized dashboard</li>
                      <li>• You'll receive setup instructions for phone integration</li>
                      <li>• Our team will help you configure your AI voice agent</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="text-red-600 mr-2">⚠️</div>
                    <div>
                      <p className="text-sm text-red-800 font-medium">Setup Error</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={currentStep === 1}
                  className="btn-premium"
                >
                  Back
                </Button>
                
                <Button
                  onClick={handleNext}
                  disabled={!isStepValid() || isSubmitting}
                  className="btn-premium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-2xl"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <>
                      {currentStep === totalSteps ? 'Complete Setup' : 'Next'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="mt-8 text-center animate-fadeInUp">
            <div className="flex items-center justify-center space-x-8 text-sm text-blue-100">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
                SSL Encrypted
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
                GDPR Compliant
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
                24/7 Support
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 