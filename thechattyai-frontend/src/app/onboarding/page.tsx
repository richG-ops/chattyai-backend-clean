'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Building, Calendar, Settings, Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'

interface FormData {
  businessName: string
  businessType: string
  ownerName: string
  email: string
  phone: string
  address: string
  description: string
  services: string[]
  workingHours: {
    start: string
    end: string
  }
  timeZone: string
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    businessType: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    services: [],
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    timeZone: 'America/Los_Angeles'
  })

  const totalSteps = 3
  const progress = (currentStep / totalSteps) * 100

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/clients/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        // Store the JWT token for later use
        localStorage.setItem('setup_token', data.jwtToken)
        localStorage.setItem('client_data', JSON.stringify(data.client))
        
        // Redirect to setup complete page
        window.location.href = '/setup-complete'
      } else {
        setError(data.error || 'Failed to create account')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
            <Phone className="w-5 h-5 mr-2" />
            <span className="text-lg font-semibold">TheChattyAI</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Let's set up your AI assistant
          </h1>
          <p className="text-gray-600">
            This will only take a few minutes to get you started
          </p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Form Card */}
        <Card className="max-w-2xl mx-auto shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {currentStep === 1 && (
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
              )}
              {currentStep === 2 && (
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              )}
              {currentStep === 3 && (
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl">
              {currentStep === 1 && "Business Information"}
              {currentStep === 2 && "Services & Hours"}
              {currentStep === 3 && "Final Setup"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Tell us about your business"}
              {currentStep === 2 && "Configure your services and availability"}
              {currentStep === 3 && "Review and complete setup"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Step 1: Business Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      placeholder="e.g., Glamour Hair Studio"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type *</Label>
                    <Select onValueChange={(value) => handleInputChange('businessType', value)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salon">Hair Salon</SelectItem>
                        <SelectItem value="medical">Medical Office</SelectItem>
                        <SelectItem value="fitness">Fitness Studio</SelectItem>
                        <SelectItem value="dental">Dental Practice</SelectItem>
                        <SelectItem value="spa">Spa & Wellness</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="consulting">Consulting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Owner Name *</Label>
                    <Input
                      id="ownerName"
                      placeholder="Your full name"
                      value={formData.ownerName}
                      onChange={(e) => handleInputChange('ownerName', e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main St, City, State"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about your business and what makes it special..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Services & Hours */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Business Hours</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Opening Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.workingHours.start}
                        onChange={(e) => handleInputChange('workingHours', {
                          ...formData.workingHours,
                          start: e.target.value
                        })}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Closing Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.workingHours.end}
                        onChange={(e) => handleInputChange('workingHours', {
                          ...formData.workingHours,
                          end: e.target.value
                        })}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Time Zone</Label>
                  <Select onValueChange={(value) => handleInputChange('timeZone', value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select your time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-semibold">Common Services</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Consultation', 'Haircut', 'Styling', 'Coloring', 'Massage', 'Facial', 'Manicure', 'Pedicure'].map((service) => (
                      <label key={service} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          onChange={(e) => {
                            const services = e.target.checked
                              ? [...formData.services, service]
                              : formData.services.filter(s => s !== service)
                            handleInputChange('services', services)
                          }}
                        />
                        <span className="text-sm">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Final Setup */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Almost Done!</h3>
                  <p className="text-gray-600">
                    Review your information and we'll set up your AI assistant
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Business Information</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Name:</strong> {formData.businessName}</p>
                      <p><strong>Type:</strong> {formData.businessType}</p>
                      <p><strong>Owner:</strong> {formData.ownerName}</p>
                      <p><strong>Email:</strong> {formData.email}</p>
                      <p><strong>Phone:</strong> {formData.phone}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Hours & Services</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Hours:</strong> {formData.workingHours.start} - {formData.workingHours.end}</p>
                      <p><strong>Time Zone:</strong> {formData.timeZone}</p>
                      <p><strong>Services:</strong> {formData.services.join(', ') || 'None selected'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">What Happens Next</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Your AI assistant will be configured within 30 minutes</li>
                    <li>• You'll receive a dedicated phone number</li>
                    <li>• Calendar integration will be set up</li>
                    <li>• You'll get email instructions for next steps</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>

          {/* Navigation */}
          <div className="flex justify-between items-center p-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            <div className="flex space-x-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full ${
                    step <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && (!formData.businessName || !formData.businessType || !formData.ownerName || !formData.email || !formData.phone)) ||
                  (currentStep === 2 && (!formData.workingHours.start || !formData.workingHours.end))
                }
              >
                Continue
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
} 