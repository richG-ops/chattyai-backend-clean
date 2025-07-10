'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Phone, 
  Star, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Award,
  Heart,
  Zap,
  Shield,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AIEmployee {
  id: string
  name: string
  title: string
  specialty: string
  avatar: string
  personality: string[]
  experience: string
  successRate: number
  avgCallTime: string
  testimonial: {
    text: string
    customer: string
    business: string
  }
  skills: string[]
  pricing: {
    base: number
    performance: number
  }
  stats: {
    callsHandled: number
    satisfaction: number
    bookings: number
  }
}

const aiEmployees: AIEmployee[] = [
  {
    id: 'luna',
    name: 'Luna',
    title: 'Customer Success Specialist',
    specialty: 'Customer Support & Satisfaction',
    avatar: '👩‍💼',
    personality: ['Empathetic', 'Warm', 'Problem-solver', 'Patient'],
    experience: '2+ years handling customer inquiries',
    successRate: 94.5,
    avgCallTime: '2m 45s',
    testimonial: {
      text: "Luna turned our customer complaints into success stories. She's like having a customer success manager who never sleeps.",
      customer: "Sarah Johnson",
      business: "Elite Hair Salon"
    },
    skills: ['Complaint Resolution', 'Appointment Scheduling', 'Customer Retention', 'Empathetic Communication'],
    pricing: {
      base: 297,
      performance: 50
    },
    stats: {
      callsHandled: 12450,
      satisfaction: 4.8,
      bookings: 8934
    }
  },
  {
    id: 'jade',
    name: 'Jade',
    title: 'Sales Intelligence AI',
    specialty: 'Lead Qualification & Sales',
    avatar: '💎',
    personality: ['Confident', 'Persuasive', 'Analytical', 'Results-driven'],
    experience: '3+ years in sales optimization',
    successRate: 67.3,
    avgCallTime: '3m 12s',
    testimonial: {
      text: "Jade doubled our booking conversion rate in the first month. She asks questions I never thought to ask.",
      customer: "Mike Rodriguez", 
      business: "Premier Dental Group"
    },
    skills: ['Lead Qualification', 'Objection Handling', 'Upselling', 'ROI Analysis'],
    pricing: {
      base: 497,
      performance: 100
    },
    stats: {
      callsHandled: 8760,
      satisfaction: 4.6,
      bookings: 5892
    }
  },
  {
    id: 'flora',
    name: 'Flora',
    title: 'Front Desk Professional',
    specialty: 'Multi-location Coordination',
    avatar: '🌸',
    personality: ['Organized', 'Detail-oriented', 'Efficient', 'Professional'],
    experience: '4+ years in medical/dental front desk',
    successRate: 99.2,
    avgCallTime: '1m 58s',
    testimonial: {
      text: "Flora handles our 3 locations flawlessly. Patients love how organized and helpful she is.",
      customer: "Dr. Lisa Chen",
      business: "Family Medical Centers"
    },
    skills: ['Multi-location Scheduling', 'Insurance Verification', 'Conflict Resolution', 'Patient Management'],
    pricing: {
      base: 397,
      performance: 75
    },
    stats: {
      callsHandled: 15680,
      satisfaction: 4.9,
      bookings: 12340
    }
  }
]

export default function AIEmployeeSelectionPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [isHiring, setIsHiring] = useState(false)
  const router = useRouter()

  const handleHireEmployee = async (employeeId: string) => {
    setIsHiring(true)
    
    // Store selected AI employee
    localStorage.setItem('selected_ai_employee', employeeId)
    
    // Simulate hiring process
    setTimeout(() => {
      router.push('/onboarding?aiEmployee=' + employeeId)
    }, 1500)
  }

  const getEmployeeIcon = (employeeId: string) => {
    switch(employeeId) {
      case 'luna': return <Heart className="w-5 h-5 text-blue-500" />
      case 'jade': return <Zap className="w-5 h-5 text-purple-500" />
      case 'flora': return <Shield className="w-5 h-5 text-green-500" />
      default: return <Users className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  TheChattyAI
                </h1>
                <p className="text-sm text-gray-400">Hire Your AI Team</p>
              </div>
            </div>
            
            <Link href="/login">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white hover:text-blue-600">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6 border border-white/20">
            <Star className="w-4 h-4 mr-2" />
            Meet your new AI employees
            <Award className="w-4 h-4 ml-2" />
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-6">
            Choose Your AI Employee
          </h1>
          
          <p className="text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto mb-8">
            Each AI employee specializes in different aspects of your business. 
            They have unique personalities, skills, and proven track records.
          </p>
          
          <div className="flex items-center justify-center space-x-8 text-sm text-blue-100">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
              Start immediately
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
              No training required
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
              Performance-based pricing
            </div>
          </div>
        </div>

        {/* AI Employee Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {aiEmployees.map((employee) => (
            <Card 
              key={employee.id}
              className={`
                border-0 bg-white/10 backdrop-blur-xl shadow-2xl transition-all duration-300 cursor-pointer
                ${selectedEmployee === employee.id 
                  ? 'ring-2 ring-blue-400 bg-white/20 scale-105' 
                  : 'hover:bg-white/15 hover:scale-105'
                }
              `}
              onClick={() => setSelectedEmployee(employee.id)}
            >
              <CardHeader className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 text-6xl">
                  {employee.avatar}
                </div>
                <CardTitle className="text-2xl text-white flex items-center justify-center space-x-2">
                  {getEmployeeIcon(employee.id)}
                  <span>{employee.name}</span>
                </CardTitle>
                <CardDescription className="text-blue-200 font-medium">
                  {employee.title}
                </CardDescription>
                <div className="text-sm text-blue-100 bg-white/10 rounded-full px-3 py-1 inline-block">
                  {employee.specialty}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Personality Traits */}
                <div>
                  <h4 className="text-white font-semibold mb-2">Personality</h4>
                  <div className="flex flex-wrap gap-2">
                    {employee.personality.map((trait) => (
                      <Badge key={trait} variant="secondary" className="bg-white/20 text-white border-white/30">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white/10 rounded-lg">
                    <div className="text-2xl font-bold text-white">{employee.successRate}%</div>
                    <div className="text-xs text-blue-200">Success Rate</div>
                  </div>
                  <div className="text-center p-3 bg-white/10 rounded-lg">
                    <div className="text-2xl font-bold text-white">{employee.avgCallTime}</div>
                    <div className="text-xs text-blue-200">Avg Call Time</div>
                  </div>
                </div>

                {/* Experience Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200">Calls Handled</span>
                    <span className="text-white font-semibold">{employee.stats.callsHandled.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200">Customer Satisfaction</span>
                    <span className="text-white font-semibold">{employee.stats.satisfaction}/5 ⭐</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200">Successful Bookings</span>
                    <span className="text-white font-semibold">{employee.stats.bookings.toLocaleString()}</span>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-white font-semibold mb-2">Core Skills</h4>
                  <div className="space-y-1">
                    {employee.skills.map((skill) => (
                      <div key={skill} className="flex items-center text-sm text-blue-100">
                        <CheckCircle className="w-3 h-3 text-green-300 mr-2" />
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Testimonial */}
                <div className="bg-white/10 p-4 rounded-lg border border-white/20">
                  <p className="text-blue-100 text-sm italic mb-2">"{employee.testimonial.text}"</p>
                  <div className="text-white text-sm font-semibold">
                    — {employee.testimonial.customer}
                  </div>
                  <div className="text-blue-300 text-xs">
                    {employee.testimonial.business}
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 p-4 rounded-lg border border-white/20">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      ${employee.pricing.base}<span className="text-lg">/month</span>
                    </div>
                    <div className="text-blue-200 text-sm mb-2">
                      + ${employee.pricing.performance} performance bonus
                    </div>
                    <div className="text-xs text-blue-100">
                      {employee.experience}
                    </div>
                  </div>
                </div>

                {/* Hire Button */}
                <Button
                  onClick={() => handleHireEmployee(employee.id)}
                  disabled={isHiring}
                  className={`
                    w-full py-6 text-lg font-semibold transition-all duration-300
                    ${selectedEmployee === employee.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-white/20 text-white hover:bg-white/30'
                    }
                  `}
                >
                  {isHiring && selectedEmployee === employee.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Hiring {employee.name}...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>Hire {employee.name}</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison Section */}
        <Card className="border-0 bg-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Not sure which AI employee to hire?</CardTitle>
            <CardDescription className="text-blue-200">Here's a quick comparison to help you decide</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-white/10 rounded-lg">
                <Heart className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Choose Luna if...</h3>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• You get customer complaints</li>
                  <li>• Need warm, empathetic support</li>
                  <li>• Want to improve satisfaction</li>
                  <li>• Handle service businesses</li>
                </ul>
              </div>
              
              <div className="text-center p-6 bg-white/10 rounded-lg">
                <Zap className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Choose Jade if...</h3>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• You need more qualified leads</li>
                  <li>• Want to increase revenue</li>
                  <li>• Handle sales inquiries</li>
                  <li>• Need objection handling</li>
                </ul>
              </div>
              
              <div className="text-center p-6 bg-white/10 rounded-lg">
                <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Choose Flora if...</h3>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• You have multiple locations</li>
                  <li>• Need organized scheduling</li>
                  <li>• Handle medical/dental</li>
                  <li>• Want maximum efficiency</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-blue-200 mb-4">
            Still have questions? <Link href="/demo" className="text-white hover:underline">Watch a live demo</Link> or <Link href="/contact" className="text-white hover:underline">talk to our team</Link>
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-blue-100">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
              30-day performance guarantee
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
              Cancel anytime
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
              24/7 support
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 