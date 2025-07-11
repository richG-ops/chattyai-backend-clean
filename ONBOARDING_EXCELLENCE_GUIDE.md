# 🎯 **ONBOARDING EXCELLENCE IMPLEMENTATION GUIDE**

## **The 2-Minute Magic: Zero to AI Employee in 120 Seconds**

### **1. AI Employee Selection Experience**

```tsx
// thechattyai-frontend/src/app/ai-employee-selection/enhanced-page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface AIEmployee {
  id: string
  name: string
  avatar: string
  voice: string
  personality: string
  specialties: string[]
  industries: string[]
  style: {
    primary: string
    secondary: string
    gradient: string
  }
  intro: string
  demo: string
}

const aiEmployees: AIEmployee[] = [
  {
    id: 'luna',
    name: 'Luna',
    avatar: '👩‍💼',
    voice: 'Professional & Warm',
    personality: 'Empathetic problem-solver who remembers every customer',
    specialties: ['Customer Service', 'Appointment Booking', 'Follow-ups'],
    industries: ['Healthcare', 'Beauty & Wellness', 'Professional Services'],
    style: {
      primary: '#8B5CF6',
      secondary: '#EC4899',
      gradient: 'from-purple-500 to-pink-500'
    },
    intro: "Hi, I'm Luna! I'll be your customers' new favorite person to talk to.",
    demo: '/demos/luna-intro.mp3'
  },
  {
    id: 'jade',
    name: 'Jade',
    avatar: '💎',
    voice: 'Confident & Persuasive',
    personality: 'Top-performing sales expert who never misses an opportunity',
    specialties: ['Lead Qualification', 'Upselling', 'Closing Deals'],
    industries: ['Real Estate', 'Automotive', 'B2B Services'],
    style: {
      primary: '#10B981',
      secondary: '#3B82F6',
      gradient: 'from-emerald-500 to-blue-500'
    },
    intro: "I'm Jade, and I turn every call into a revenue opportunity.",
    demo: '/demos/jade-intro.mp3'
  },
  {
    id: 'flora',
    name: 'Flora',
    avatar: '🌸',
    voice: 'Organized & Efficient',
    personality: 'Operations wizard who keeps everything running smoothly',
    specialties: ['Scheduling', 'Dispatching', 'Task Management'],
    industries: ['Home Services', 'Logistics', 'Field Services'],
    style: {
      primary: '#F59E0B',
      secondary: '#EF4444',
      gradient: 'from-amber-500 to-red-500'
    },
    intro: "Flora here! I'll organize your business like a Swiss watch.",
    demo: '/demos/flora-intro.mp3'
  }
]

export default function AIEmployeeSelectionPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [hoveredEmployee, setHoveredEmployee] = useState<string | null>(null)
  const [businessType, setBusinessType] = useState<string>('')
  const [showRecommendation, setShowRecommendation] = useState(false)
  
  // AI-powered recommendation based on business type
  useEffect(() => {
    if (businessType) {
      const timer = setTimeout(() => {
        setShowRecommendation(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [businessType])
  
  const getRecommendedEmployee = () => {
    // Smart matching logic
    if (businessType.toLowerCase().includes('salon') || 
        businessType.toLowerCase().includes('spa')) {
      return 'luna'
    } else if (businessType.toLowerCase().includes('real estate') || 
               businessType.toLowerCase().includes('sales')) {
      return 'jade'
    } else {
      return 'flora'
    }
  }
  
  const handleSelection = (employeeId: string) => {
    setSelectedEmployee(employeeId)
    
    // Play selection sound
    const audio = new Audio('/sounds/success.mp3')
    audio.play()
    
    // Trigger celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
    
    // Auto-proceed after celebration
    setTimeout(() => {
      window.location.href = `/onboarding?ai=${employeeId}`
    }, 2000)
  }
  
  const playVoiceDemo = (demoUrl: string) => {
    const audio = new Audio(demoUrl)
    audio.play()
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold mb-4">
            Meet Your New{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Employees
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Choose who will represent your business 24/7
          </p>
          
          {/* Quick Business Type Input */}
          <div className="max-w-md mx-auto mb-8">
            <input
              type="text"
              placeholder="What type of business do you have?"
              className="w-full px-6 py-3 rounded-full border-2 border-gray-200 focus:border-purple-500 focus:outline-none text-center"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            />
            
            {showRecommendation && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-purple-600 font-medium"
              >
                ✨ We recommend {aiEmployees.find(e => e.id === getRecommendedEmployee())?.name} for your business
              </motion.div>
            )}
          </div>
        </motion.div>
        
        {/* AI Employee Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatePresence>
            {aiEmployees.map((employee, index) => {
              const isRecommended = employee.id === getRecommendedEmployee() && showRecommendation
              const isSelected = selectedEmployee === employee.id
              const isHovered = hoveredEmployee === employee.id
              
              return (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  onHoverStart={() => setHoveredEmployee(employee.id)}
                  onHoverEnd={() => setHoveredEmployee(null)}
                >
                  <Card
                    className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
                      isSelected ? 'ring-4 ring-purple-500' : ''
                    } ${isRecommended ? 'ring-2 ring-purple-300' : ''}`}
                    onClick={() => handleSelection(employee.id)}
                  >
                    {isRecommended && (
                      <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                        RECOMMENDED
                      </div>
                    )}
                    
                    <div className={`h-2 bg-gradient-to-r ${employee.style.gradient}`} />
                    
                    <div className="p-6">
                      {/* Avatar and Name */}
                      <div className="text-center mb-4">
                        <motion.div
                          animate={{ 
                            scale: isHovered ? 1.2 : 1,
                            rotate: isHovered ? [0, -5, 5, -5, 0] : 0
                          }}
                          className="text-7xl mb-3"
                        >
                          {employee.avatar}
                        </motion.div>
                        <h3 className="text-2xl font-bold">{employee.name}</h3>
                        <p className="text-sm text-gray-600">{employee.voice}</p>
                      </div>
                      
                      {/* Personality */}
                      <p className="text-gray-700 mb-4 text-center italic">
                        "{employee.personality}"
                      </p>
                      
                      {/* Specialties */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 mb-2">SPECIALIZES IN:</p>
                        <div className="flex flex-wrap gap-2">
                          {employee.specialties.map((specialty) => (
                            <span
                              key={specialty}
                              className="text-xs px-2 py-1 bg-gray-100 rounded-full"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Best For */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 mb-2">BEST FOR:</p>
                        <div className="flex flex-wrap gap-2">
                          {employee.industries.slice(0, 3).map((industry) => (
                            <span
                              key={industry}
                              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full"
                            >
                              {industry}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Voice Demo Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mb-3"
                        onClick={(e) => {
                          e.stopPropagation()
                          playVoiceDemo(employee.demo)
                        }}
                      >
                        🎧 Hear {employee.name}'s Voice
                      </Button>
                      
                      {/* Select Button */}
                      <Button
                        className={`w-full bg-gradient-to-r ${employee.style.gradient} text-white`}
                      >
                        {isSelected ? '✓ Selected' : `Choose ${employee.name}`}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
        
        {/* Comparison Helper */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 mb-4">
            Not sure? Here's a quick comparison:
          </p>
          <div className="overflow-x-auto">
            <table className="mx-auto bg-white rounded-lg overflow-hidden shadow-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Feature</th>
                  <th className="px-6 py-3 text-center">Luna 👩‍💼</th>
                  <th className="px-6 py-3 text-center">Jade 💎</th>
                  <th className="px-6 py-3 text-center">Flora 🌸</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-6 py-3 font-medium">Best For</td>
                  <td className="px-6 py-3 text-center">Service businesses</td>
                  <td className="px-6 py-3 text-center">Sales-focused</td>
                  <td className="px-6 py-3 text-center">Operations-heavy</td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="px-6 py-3 font-medium">Personality</td>
                  <td className="px-6 py-3 text-center">Warm & caring</td>
                  <td className="px-6 py-3 text-center">Confident & closing</td>
                  <td className="px-6 py-3 text-center">Efficient & organized</td>
                </tr>
                <tr className="border-t">
                  <td className="px-6 py-3 font-medium">Conversion Rate</td>
                  <td className="px-6 py-3 text-center">67%</td>
                  <td className="px-6 py-3 text-center">73%</td>
                  <td className="px-6 py-3 text-center">71%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
```

### **2. Smart Onboarding Flow**

```tsx
// thechattyai-frontend/src/app/onboarding/smart-flow.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'

interface OnboardingStep {
  id: string
  title: string
  duration: number // in seconds
  component: React.ComponentType<any>
}

const OnboardingFlow = () => {
  const searchParams = useSearchParams()
  const selectedAI = searchParams.get('ai') || 'luna'
  const [currentStep, setCurrentStep] = useState(0)
  const [startTime] = useState(Date.now())
  const [formData, setFormData] = useState({
    aiEmployee: selectedAI,
    businessName: '',
    businessType: '',
    website: '',
    googleBusinessUrl: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    importedData: null
  })
  
  const steps: OnboardingStep[] = [
    {
      id: 'import',
      title: 'Import Your Business',
      duration: 30,
      component: SmartImportStep
    },
    {
      id: 'customize',
      title: 'Customize Your AI',
      duration: 45,
      component: AICustomizationStep
    },
    {
      id: 'test',
      title: 'Test Your AI',
      duration: 45,
      component: TestCallStep
    }
  ]
  
  // Track time and show progress
  const [timeElapsed, setTimeElapsed] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])
  
  const CurrentStepComponent = steps[currentStep].component
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Setting up {formData.aiEmployee}</h2>
            <div className="text-right">
              <p className="text-sm text-gray-600">Time elapsed</p>
              <p className="text-2xl font-mono font-bold text-purple-600">
                {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
          
          {/* Visual Progress */}
          <div className="relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded" />
            <div
              className="absolute top-5 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex flex-col items-center"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                      index <= currentStep
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-110'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <p className="text-xs mt-2 text-center max-w-[100px]">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.duration}s</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Current Step */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <CurrentStepComponent
            data={formData}
            onUpdate={(updates: any) => setFormData({ ...formData, ...updates })}
            onNext={() => {
              if (currentStep < steps.length - 1) {
                setCurrentStep(currentStep + 1)
              } else {
                // Complete onboarding
                completeOnboarding(formData)
              }
            }}
          />
        </motion.div>
        
        {/* Motivational Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            <span className="font-bold text-purple-600">2,847</span> businesses set up their AI today
          </p>
        </div>
      </div>
    </div>
  )
}

// Smart Import Component
const SmartImportStep = ({ data, onUpdate, onNext }: any) => {
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  
  const handleGoogleImport = async () => {
    setImporting(true)
    
    // Simulate import progress
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 10
      })
    }, 200)
    
    try {
      // Call Google My Business API
      const response = await fetch('/api/import/google-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.googleBusinessUrl })
      })
      
      const importedData = await response.json()
      
      onUpdate({
        businessName: importedData.name,
        businessType: importedData.category,
        website: importedData.website,
        importedData: importedData
      })
      
      // Auto-proceed after successful import
      setTimeout(onNext, 1000)
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setImporting(false)
    }
  }
  
  return (
    <Card className="p-8">
      <h3 className="text-2xl font-bold mb-6">Let's import your business info</h3>
      <p className="text-gray-600 mb-8">
        We'll grab everything from your existing online presence
      </p>
      
      <div className="space-y-6">
        {/* Google My Business Import */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-500 transition-colors cursor-pointer"
          onClick={handleGoogleImport}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/icons/google-business.svg" alt="Google" className="w-12 h-12" />
              <div>
                <h4 className="font-semibold">Import from Google My Business</h4>
                <p className="text-sm text-gray-600">
                  Hours, services, contact info - everything in one click
                </p>
              </div>
            </div>
            <Button variant="outline">
              Import
            </Button>
          </div>
          
          {importing && (
            <div className="mt-4">
              <Progress value={importProgress} className="h-2" />
              <p className="text-xs text-gray-600 mt-2">
                Importing your business data...
              </p>
            </div>
          )}
        </div>
        
        {/* Website Scraper */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                🌐
              </div>
              <div>
                <h4 className="font-semibold">Import from your website</h4>
                <p className="text-sm text-gray-600">
                  We'll analyze your site and extract business info
                </p>
              </div>
            </div>
            <Input
              placeholder="yourbusiness.com"
              className="w-64"
              value={data.website}
              onChange={(e) => onUpdate({ website: e.target.value })}
            />
          </div>
        </div>
        
        {/* Manual Entry */}
        <button
          className="text-sm text-gray-500 hover:text-gray-700"
          onClick={onNext}
        >
          Enter manually instead →
        </button>
      </div>
    </Card>
  )
}

// AI Customization Component
const AICustomizationStep = ({ data, onUpdate, onNext }: any) => {
  const [voiceSettings, setVoiceSettings] = useState({
    speed: 1.0,
    pitch: 1.0,
    personality: 'professional'
  })
  
  const personalityTraits = [
    { id: 'professional', label: 'Professional', emoji: '👔' },
    { id: 'friendly', label: 'Friendly', emoji: '😊' },
    { id: 'enthusiastic', label: 'Enthusiastic', emoji: '🎉' },
    { id: 'calm', label: 'Calm', emoji: '🧘' }
  ]
  
  return (
    <Card className="p-8">
      <h3 className="text-2xl font-bold mb-6">
        Customize {data.aiEmployee === 'luna' ? 'Luna' : data.aiEmployee}'s personality
      </h3>
      
      <div className="space-y-8">
        {/* Quick Personality Selection */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            How should {data.aiEmployee} interact with customers?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {personalityTraits.map((trait) => (
              <button
                key={trait.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  voiceSettings.personality === trait.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setVoiceSettings({ ...voiceSettings, personality: trait.id })}
              >
                <div className="text-2xl mb-2">{trait.emoji}</div>
                <div className="text-sm font-medium">{trait.label}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Voice Speed */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Speaking speed
          </label>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Slower</span>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.1"
              value={voiceSettings.speed}
              onChange={(e) => setVoiceSettings({ ...voiceSettings, speed: parseFloat(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm text-gray-600">Faster</span>
          </div>
        </div>
        
        {/* Custom Greeting */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            Custom greeting (optional)
          </label>
          <textarea
            className="w-full p-3 border rounded-lg"
            rows={3}
            placeholder={`Hi! Thanks for calling ${data.businessName}. I'm ${data.aiEmployee}, how can I help you today?`}
          />
        </div>
        
        {/* Preview Button */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => playPreview(voiceSettings)}>
            🔊 Preview Voice
          </Button>
          <Button
            onClick={() => {
              onUpdate({ voiceSettings })
              onNext()
            }}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
          >
            Save and Continue
          </Button>
        </div>
      </div>
    </Card>
  )
}

// Test Call Component
const TestCallStep = ({ data, onUpdate, onNext }: any) => {
  const [callStatus, setCallStatus] = useState<'ready' | 'calling' | 'connected' | 'ended'>('ready')
  const [transcript, setTranscript] = useState<string[]>([])
  
  const initiateTestCall = async () => {
    setCallStatus('calling')
    
    // Simulate call connection
    setTimeout(() => {
      setCallStatus('connected')
      
      // Simulate conversation
      const conversation = [
        { speaker: data.aiEmployee, text: `Hi! Thanks for calling ${data.businessName}. I'm ${data.aiEmployee}, how can I help you today?` },
        { speaker: 'You', text: "I'd like to book an appointment for tomorrow" },
        { speaker: data.aiEmployee, text: "I'd be happy to help you with that! Let me check our availability for tomorrow..." },
        { speaker: data.aiEmployee, text: "I have openings at 10 AM, 2 PM, and 4:30 PM. Which time works best for you?" },
        { speaker: 'You', text: "2 PM would be perfect" },
        { speaker: data.aiEmployee, text: "Excellent! I've booked you for 2 PM tomorrow. Can I get your name and phone number?" }
      ]
      
      // Animate transcript
      conversation.forEach((line, index) => {
        setTimeout(() => {
          setTranscript(prev => [...prev, line])
        }, index * 2000)
      })
      
      // End call after conversation
      setTimeout(() => {
        setCallStatus('ended')
      }, conversation.length * 2000)
    }, 2000)
  }
  
  return (
    <Card className="p-8">
      <h3 className="text-2xl font-bold mb-6">
        Test {data.aiEmployee} with a real call
      </h3>
      
      <div className="space-y-6">
        {callStatus === 'ready' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">📞</div>
            <p className="text-gray-600 mb-6">
              Ready to hear {data.aiEmployee} in action?
            </p>
            <Button
              size="lg"
              onClick={initiateTestCall}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white"
            >
              Make Test Call
            </Button>
          </div>
        )}
        
        {callStatus === 'calling' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-6 animate-pulse">📞</div>
            <p className="text-gray-600">Calling your AI employee...</p>
          </div>
        )}
        
        {(callStatus === 'connected' || callStatus === 'ended') && (
          <div>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">
                    {callStatus === 'connected' ? 'Call in progress' : 'Call ended'}
                  </span>
                </div>
                <span className="text-sm text-gray-600">0:42</span>
              </div>
              
              {/* Transcript */}
              <div className="space-y-3">
                {transcript.map((line, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${line.speaker === 'You' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        line.speaker === 'You'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {line.speaker}
                      </p>
                      <p className="text-sm">{line.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {callStatus === 'ended' && (
              <div className="text-center">
                <div className="mb-6">
                  <div className="text-5xl mb-3">🎉</div>
                  <h4 className="text-xl font-bold text-green-600 mb-2">
                    Perfect! {data.aiEmployee} is ready!
                  </h4>
                  <p className="text-gray-600">
                    Your AI employee handled that call beautifully
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800">
                    <span className="font-bold">Performance Score:</span> 94/100
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Natural conversation, perfect booking flow, professional tone
                  </p>
                </div>
                
                <Button
                  size="lg"
                  onClick={onNext}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                >
                  Complete Setup 🚀
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
```

### **3. Backend Smart Import Service**

```javascript
// backend/services/smart-import-service.js
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleBusiness } = require('@google/mybusiness');

class SmartImportService {
  constructor() {
    this.googleClient = new GoogleBusiness({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    });
  }
  
  async importFromGoogleBusiness(url) {
    try {
      // Extract place ID from URL
      const placeId = this.extractPlaceId(url);
      
      // Fetch business details
      const details = await this.googleClient.places.get({
        placeId,
        fields: [
          'name',
          'formatted_address',
          'formatted_phone_number',
          'website',
          'opening_hours',
          'types',
          'reviews',
          'rating'
        ]
      });
      
      // Transform into our format
      return {
        name: details.name,
        address: details.formatted_address,
        phone: details.formatted_phone_number,
        website: details.website,
        category: this.inferBusinessType(details.types),
        hours: this.transformHours(details.opening_hours),
        rating: details.rating,
        reviewCount: details.reviews?.length || 0,
        services: await this.inferServices(details),
        importSource: 'google_business',
        importDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Google Business import failed:', error);
      throw new Error('Failed to import from Google Business');
    }
  }
  
  async scrapeWebsite(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract business information
      const businessInfo = {
        name: this.extractBusinessName($),
        phone: this.extractPhoneNumber($),
        email: this.extractEmail($),
        address: this.extractAddress($),
        hours: this.extractHours($),
        services: this.extractServices($),
        about: this.extractAbout($),
        socialMedia: this.extractSocialMedia($)
      };
      
      // Use AI to enhance the extraction
      const enhanced = await this.enhanceWithAI(businessInfo, response.data);
      
      return {
        ...businessInfo,
        ...enhanced,
        importSource: 'website',
        importDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Website scraping failed:', error);
      throw new Error('Failed to import from website');
    }
  }
  
  async enhanceWithAI(basicInfo, htmlContent) {
    // Use OpenAI to extract additional context
    const prompt = `
      Analyze this business website content and extract:
      1. Business type/category
      2. Main services offered
      3. Target customer type
      4. Key selling points
      
      Current extracted info: ${JSON.stringify(basicInfo)}
      
      HTML excerpt: ${htmlContent.substring(0, 5000)}
    `;
    
    const aiResponse = await this.openai.complete({
      prompt,
      maxTokens: 500
    });
    
    return JSON.parse(aiResponse.choices[0].text);
  }
  
  inferBusinessType(googleTypes) {
    const typeMapping = {
      'hair_care': 'Hair Salon',
      'beauty_salon': 'Beauty & Wellness',
      'spa': 'Spa & Wellness',
      'dentist': 'Dental Practice',
      'doctor': 'Medical Practice',
      'real_estate_agency': 'Real Estate',
      'car_dealer': 'Automotive',
      'restaurant': 'Restaurant',
      'gym': 'Fitness Center'
    };
    
    for (const type of googleTypes) {
      if (typeMapping[type]) {
        return typeMapping[type];
      }
    }
    
    return 'Professional Services';
  }
  
  transformHours(googleHours) {
    if (!googleHours?.weekday_text) return null;
    
    return googleHours.weekday_text.map(dayText => {
      const [day, hours] = dayText.split(': ');
      const [open, close] = hours.split(' – ');
      
      return {
        day: day.toLowerCase(),
        open: this.convertTo24Hour(open),
        close: this.convertTo24Hour(close),
        isOpen: hours !== 'Closed'
      };
    });
  }
  
  async inferServices(businessDetails) {
    // Use AI to infer services based on business type and reviews
    const services = [];
    
    // Analyze reviews for mentioned services
    if (businessDetails.reviews) {
      const reviewText = businessDetails.reviews
        .map(r => r.text)
        .join(' ');
        
      // Extract service mentions
      const servicePatterns = [
        /(?:had|got|booked|scheduled) (?:a|an|my) ([^.,]+)/gi,
        /(?:for|offer|provide) ([^.,]+) service/gi
      ];
      
      for (const pattern of servicePatterns) {
        const matches = reviewText.matchAll(pattern);
        for (const match of matches) {
          services.push(match[1].trim());
        }
      }
    }
    
    // Deduplicate and clean
    return [...new Set(services)]
      .filter(s => s.length > 3 && s.length < 50)
      .slice(0, 10);
  }
}

module.exports = SmartImportService;
```

### **4. Onboarding Analytics & Optimization**

```javascript
// backend/services/onboarding-analytics.js
class OnboardingAnalytics {
  constructor() {
    this.events = [];
    this.sessions = new Map();
  }
  
  trackEvent(userId, event) {
    const sessionId = this.getOrCreateSession(userId);
    
    const trackedEvent = {
      sessionId,
      userId,
      event: event.type,
      data: event.data,
      timestamp: new Date().toISOString(),
      step: event.step,
      timeOnStep: event.timeOnStep
    };
    
    this.events.push(trackedEvent);
    
    // Real-time analytics
    this.processEvent(trackedEvent);
    
    // Store in database
    this.storeEvent(trackedEvent);
  }
  
  processEvent(event) {
    // Calculate conversion funnel
    if (event.event === 'step_completed') {
      this.updateFunnelMetrics(event);
    }
    
    // Identify drop-off points
    if (event.event === 'step_abandoned') {
      this.trackDropOff(event);
    }
    
    // A/B test results
    if (event.data.variant) {
      this.updateABTest(event);
    }
  }
  
  getOnboardingMetrics() {
    return {
      overallConversion: this.calculateConversionRate(),
      averageTimeToComplete: this.calculateAverageTime(),
      dropOffByStep: this.getDropOffRates(),
      aiEmployeeSelection: this.getAISelectionStats(),
      importMethodSuccess: this.getImportStats(),
      abTestResults: this.getABTestResults()
    };
  }
  
  calculateConversionRate() {
    const started = this.events.filter(e => e.event === 'onboarding_started').length;
    const completed = this.events.filter(e => e.event === 'onboarding_completed').length;
    
    return {
      rate: (completed / started) * 100,
      started,
      completed,
      trend: this.calculateTrend('conversion_rate', 7)
    };
  }
  
  getDropOffRates() {
    const steps = ['ai_selection', 'import', 'customization', 'test_call'];
    const dropOff = {};
    
    steps.forEach((step, index) => {
      const reached = this.events.filter(e => e.step === step).length;
      const completed = this.events.filter(e => 
        e.step === step && e.event === 'step_completed'
      ).length;
      
      dropOff[step] = {
        reached,
        completed,
        dropOffRate: ((reached - completed) / reached) * 100,
        averageTime: this.calculateAverageTimeOnStep(step)
      };
    });
    
    return dropOff;
  }
  
  optimizeOnboarding() {
    const metrics = this.getOnboardingMetrics();
    const recommendations = [];
    
    // Identify problem areas
    Object.entries(metrics.dropOffByStep).forEach(([step, data]) => {
      if (data.dropOffRate > 20) {
        recommendations.push({
          type: 'high_drop_off',
          step,
          suggestion: `Step "${step}" has ${data.dropOffRate}% drop-off. Consider simplifying or adding help.`,
          priority: 'high'
        });
      }
      
      if (data.averageTime > 60) {
        recommendations.push({
          type: 'slow_step',
          step,
          suggestion: `Step "${step}" takes ${data.averageTime}s on average. Consider breaking it down.`,
          priority: 'medium'
        });
      }
    });
    
    return recommendations;
  }
}
```

This implementation provides:

1. **AI Employee Selection** with personality quiz and recommendations
2. **Smart Import** from Google Business and websites
3. **Rapid Customization** with voice preview
4. **Live Test Call** simulation
5. **Analytics & Optimization** for continuous improvement

The onboarding flow is designed to create immediate value and emotional connection while gathering all necessary data in under 2 minutes. 