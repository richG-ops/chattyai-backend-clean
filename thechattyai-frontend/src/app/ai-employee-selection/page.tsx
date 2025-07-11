'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Phone, 
  ArrowRight,
  Sparkles,
  Brain,
  Mic,
  Calendar,
  Shield,
  TrendingUp,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface AIEmployee {
  id: string
  name: string
  role: string
  specialty: string
  icon: React.ReactNode
  gradient: string
  accentColor: string
  description: string
  capabilities: string[]
  performance: {
    metric: string
    value: string
  }
}

const aiEmployees: AIEmployee[] = [
  {
    id: 'luna',
    name: 'Luna',
    role: 'Customer Excellence',
    specialty: 'Empathetic Communication',
    icon: <Brain className="w-8 h-8" />,
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    accentColor: 'cyan',
    description: 'Neural-optimized for emotional intelligence and conflict resolution.',
    capabilities: ['Complaint Resolution', 'Empathetic Responses', 'Customer Retention'],
    performance: {
      metric: 'Satisfaction Rate',
      value: '98.7%'
    }
  },
  {
    id: 'jade',
    name: 'Jade',
    role: 'Revenue Intelligence',
    specialty: 'Strategic Sales',
    icon: <TrendingUp className="w-8 h-8" />,
    gradient: 'from-purple-500 via-pink-500 to-red-500',
    accentColor: 'purple',
    description: 'Advanced lead qualification with predictive revenue modeling.',
    capabilities: ['Lead Scoring', 'Objection Handling', 'Deal Acceleration'],
    performance: {
      metric: 'Conversion Rate',
      value: '73.2%'
    }
  },
  {
    id: 'flora',
    name: 'Flora',
    role: 'Operations AI',
    specialty: 'System Orchestration',
    icon: <Calendar className="w-8 h-8" />,
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    accentColor: 'emerald',
    description: 'Quantum-efficient scheduling across multiple dimensions.',
    capabilities: ['Multi-location Sync', 'Resource Optimization', 'Conflict Prevention'],
    performance: {
      metric: 'Efficiency Score',
      value: '99.9%'
    }
  }
]

export default function AIEmployeeSelectionPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [hoveredEmployee, setHoveredEmployee] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Add parallax effect on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.querySelectorAll('.ai-card')
      cards.forEach((card: any) => {
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        
        card.style.transform = `
          perspective(1000px)
          rotateY(${x * 0.05}deg)
          rotateX(${-y * 0.05}deg)
          translateZ(20px)
        `
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleConnect = async (employeeId: string) => {
    setIsConnecting(true)
    localStorage.setItem('selected_ai_employee', employeeId)
    
    setTimeout(() => {
      router.push('/onboarding?aiEmployee=' + employeeId)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Premium gradient background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-blue-900/10" />
      </div>
      
      {/* Animated particles */}
      <div className="fixed inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 20}s`
            }}
          />
        ))}
      </div>
      
      {/* Header */}
      <header className="relative z-20 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-10 h-10 bg-black rounded-xl flex items-center justify-center border border-white/20">
                  <Phone className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-light text-white">TheChattyAI</span>
            </Link>
            
            <nav className="flex items-center space-x-6">
              <Link href="/login" className="text-white/70 hover:text-white transition-colors">
                Sign In
              </Link>
              <Button 
                variant="ghost" 
                className="text-white/70 hover:text-white hover:bg-white/5 rounded-full px-4"
              >
                Contact Sales
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8">
            <Sparkles className="w-4 h-4 mr-2 text-cyan-400" />
            <span className="text-sm text-white/70">Next Generation AI Workforce</span>
          </div>
          
          <h1 className="text-7xl lg:text-8xl font-extralight mb-6 tracking-tight">
            <span className="text-white">Select Your</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-light">
              AI Professional
            </span>
          </h1>
          
          <p className="text-xl text-white/50 max-w-3xl mx-auto leading-relaxed font-light">
            Industry-leading AI employees engineered for excellence. 
            Each with specialized neural architectures optimized for their domain.
          </p>
        </div>

        {/* AI Employee Grid */}
        <div className="grid lg:grid-cols-3 gap-8 perspective-1000">
          {aiEmployees.map((employee, index) => (
            <div
              key={employee.id}
              className="ai-card relative group"
              onMouseEnter={() => setHoveredEmployee(employee.id)}
              onMouseLeave={() => setHoveredEmployee(null)}
              onClick={() => setSelectedEmployee(employee.id)}
              style={{
                transformStyle: 'preserve-3d',
                animation: `fadeInUp 0.8s ease-out ${index * 0.1}s both`
              }}
            >
              {/* Holographic effect background */}
              <div className={`
                absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500
                bg-gradient-to-br ${employee.gradient} blur-xl
              `} />
              
              {/* Main card */}
              <div className={`
                relative rounded-3xl p-8 backdrop-blur-xl border transition-all duration-500
                ${selectedEmployee === employee.id 
                  ? 'bg-white/10 border-white/30 scale-[1.02]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }
              `}>
                {/* 3D Holographic Display */}
                <div className="relative h-48 mb-8 rounded-2xl overflow-hidden bg-black/50">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  
                  {/* Holographic grid */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="grid grid-cols-8 h-full">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="border-r border-cyan-500/30" />
                      ))}
                    </div>
                    <div className="absolute inset-0 grid grid-rows-8">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="border-b border-cyan-500/30" />
                      ))}
                    </div>
                  </div>
                  
                  {/* Floating icon */}
                  <div className={`
                    absolute inset-0 flex items-center justify-center
                    ${hoveredEmployee === employee.id ? 'animate-pulse-scale' : ''}
                  `}>
                    <div className={`
                      relative p-6 rounded-2xl
                      bg-gradient-to-br ${employee.gradient}
                      shadow-2xl transform rotate-3 hover:rotate-6 transition-transform
                    `}>
                      {employee.icon}
                    </div>
                  </div>
                  
                  {/* Performance metric overlay */}
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                    <div className="text-xs text-white/50">{employee.performance.metric}</div>
                    <div className="text-lg font-light text-white">{employee.performance.value}</div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-3xl font-light text-white mb-1">{employee.name}</h3>
                    <p className="text-sm text-white/50">{employee.role}</p>
                    <div className={`
                      inline-block mt-2 px-3 py-1 rounded-full text-xs
                      bg-gradient-to-r ${employee.gradient} bg-opacity-20
                      border border-white/10 text-white/80
                    `}>
                      {employee.specialty}
                    </div>
                  </div>

                  <p className="text-white/60 text-sm leading-relaxed">
                    {employee.description}
                  </p>

                  {/* Capabilities */}
                  <div className="space-y-2">
                    {employee.capabilities.map((capability, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full bg-${employee.accentColor}-400`} />
                        <span className="text-sm text-white/70">{capability}</span>
                      </div>
                    ))}
                  </div>

                  {/* Connect button */}
                  <Button
                    onClick={() => handleConnect(employee.id)}
                    disabled={isConnecting && selectedEmployee === employee.id}
                    className={`
                      w-full rounded-xl py-6 font-light text-base transition-all duration-300
                      ${selectedEmployee === employee.id
                        ? `bg-gradient-to-r ${employee.gradient} text-white border-0 shadow-lg`
                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/20'
                      }
                    `}
                  >
                    {isConnecting && selectedEmployee === employee.id ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        <span>Initializing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>Deploy {employee.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </div>

                {/* Selection indicator */}
                {selectedEmployee === employee.id && (
                  <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-50 blur-sm -z-10" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom indicators */}
        <div className="flex justify-center mt-16 space-x-8">
          <div className="flex items-center space-x-2 text-white/50">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Enterprise Security</span>
          </div>
          <div className="flex items-center space-x-2 text-white/50">
            <Mic className="w-4 h-4" />
            <span className="text-sm">Voice Optimized</span>
          </div>
          <div className="flex items-center space-x-2 text-white/50">
            <Users className="w-4 h-4" />
            <span className="text-sm">24/7 Availability</span>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float-particle {
          from {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          to {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes pulse-scale {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        .animate-float-particle {
          animation: float-particle linear infinite;
        }
        
        .animate-pulse-scale {
          animation: pulse-scale 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
} 