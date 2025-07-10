'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Phone, 
  ArrowRight,
  Sparkles,
  Heart,
  Zap,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AIEmployee {
  id: string
  name: string
  role: string
  specialty: string
  avatar: string
  personality: string
  description: string
  excellence: string
}

const aiEmployees: AIEmployee[] = [
  {
    id: 'luna',
    name: 'Luna',
    role: 'Customer Success',
    specialty: 'Relationship Excellence',
    avatar: '👩‍💼',
    personality: 'Empathetic • Warm • Trusted',
    description: 'Transforms customer experiences with genuine care and exceptional problem-solving.',
    excellence: 'Masters the art of turning challenges into customer loyalty'
  },
  {
    id: 'jade',
    name: 'Jade',
    role: 'Sales Intelligence',
    specialty: 'Growth Catalyst',
    avatar: '💎',
    personality: 'Strategic • Insightful • Results-Driven',
    description: 'Identifies opportunities and drives growth through intelligent conversations.',
    excellence: 'Elevates every interaction into meaningful business outcomes'
  },
  {
    id: 'flora',
    name: 'Flora',
    role: 'Operations',
    specialty: 'Seamless Coordination',
    avatar: '🌸',
    personality: 'Precise • Efficient • Reliable',
    description: 'Orchestrates complex operations with flawless attention to detail.',
    excellence: 'Delivers perfection in every process and interaction'
  }
]

export default function AIEmployeeSelectionPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const router = useRouter()

  const handleConnect = async (employeeId: string) => {
    setIsConnecting(true)
    localStorage.setItem('selected_ai_employee', employeeId)
    
    setTimeout(() => {
      router.push('/onboarding?aiEmployee=' + employeeId)
    }, 1200)
  }

  const getEmployeeIcon = (employeeId: string) => {
    switch(employeeId) {
      case 'luna': return <Heart className="w-6 h-6 text-blue-500" />
      case 'jade': return <Zap className="w-6 h-6 text-purple-500" />
      case 'flora': return <Shield className="w-6 h-6 text-green-500" />
      default: return <Sparkles className="w-6 h-6" />
    }
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/20 via-purple-900/10 to-blue-900/20 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-black" />
              </div>
              <span className="text-xl font-medium">TheChattyAI</span>
            </div>
            
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full text-white/70 text-sm mb-8 border border-white/10">
            <Sparkles className="w-4 h-4 mr-2" />
            Meet Your AI Team
          </div>
          
          <h1 className="text-6xl lg:text-8xl font-light mb-8 leading-tight">
            Your AI
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Employees
            </span>
          </h1>
          
          <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Three exceptional AI professionals, each with unique expertise 
            and proven excellence in their field.
          </p>
        </div>

        {/* AI Employee Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {aiEmployees.map((employee, index) => (
            <Card 
              key={employee.id}
              className={`
                group relative border-0 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl 
                transition-all duration-500 cursor-pointer hover:scale-[1.02] hover:bg-white/10
                ${selectedEmployee === employee.id ? 'ring-1 ring-white/20 bg-white/10' : ''}
              `}
              onClick={() => setSelectedEmployee(employee.id)}
              style={{
                animationDelay: `${index * 150}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards'
              }}
            >
              <CardHeader className="text-center pb-6">
                <div className="w-24 h-24 mx-auto mb-6 text-7xl">
                  {employee.avatar}
                </div>
                <div className="flex items-center justify-center mb-2">
                  {getEmployeeIcon(employee.id)}
                  <CardTitle className="text-2xl font-medium text-white ml-3">
                    {employee.name}
                  </CardTitle>
                </div>
                <CardDescription className="text-white/50 text-sm">
                  {employee.role}
                </CardDescription>
                <div className="inline-block px-3 py-1 bg-white/5 rounded-full text-xs text-white/70 mt-2">
                  {employee.specialty}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Personality */}
                <div className="text-center">
                  <p className="text-white/60 text-sm mb-3">{employee.personality}</p>
                  <p className="text-white/80 leading-relaxed">{employee.description}</p>
                </div>

                {/* Excellence Note */}
                <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-white/70 text-sm italic">
                    "{employee.excellence}"
                  </p>
                </div>

                {/* Connect Button */}
                <Button
                  onClick={() => handleConnect(employee.id)}
                  disabled={isConnecting}
                  className={`
                    w-full py-6 text-base font-medium transition-all duration-300 rounded-xl
                    ${selectedEmployee === employee.id
                      ? 'bg-white text-black hover:bg-white/90 shadow-lg shadow-white/20'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }
                  `}
                >
                  {isConnecting && selectedEmployee === employee.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span>Connect with {employee.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-8 text-sm text-white/50">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span>Available 24/7</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              <span>Instant Setup</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
              <span>Elite Performance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
} 