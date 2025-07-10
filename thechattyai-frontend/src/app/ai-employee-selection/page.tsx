'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
  personality: string
  description: string
  excellence: string
  color: string
  glowColor: string
}

const aiEmployees: AIEmployee[] = [
  {
    id: 'luna',
    name: 'Luna',
    role: 'Customer Success',
    specialty: 'Relationship Excellence',
    personality: 'Empathetic • Warm • Trusted',
    description: 'Transforms customer experiences with genuine care and exceptional problem-solving.',
    excellence: 'Masters the art of turning challenges into customer loyalty',
    color: 'from-blue-400 to-cyan-400',
    glowColor: 'shadow-blue-400/50'
  },
  {
    id: 'jade',
    name: 'Jade',
    role: 'Sales Intelligence',
    specialty: 'Growth Catalyst',
    personality: 'Strategic • Insightful • Results-Driven',
    description: 'Identifies opportunities and drives growth through intelligent conversations.',
    excellence: 'Elevates every interaction into meaningful business outcomes',
    color: 'from-purple-400 to-pink-400',
    glowColor: 'shadow-purple-400/50'
  },
  {
    id: 'flora',
    name: 'Flora',
    role: 'Operations',
    specialty: 'Seamless Coordination',
    personality: 'Precise • Efficient • Reliable',
    description: 'Orchestrates complex operations with flawless attention to detail.',
    excellence: 'Delivers perfection in every process and interaction',
    color: 'from-green-400 to-emerald-400',
    glowColor: 'shadow-green-400/50'
  }
]

export default function AIEmployeeSelectionPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [hoveredEmployee, setHoveredEmployee] = useState<string | null>(null)
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
      case 'luna': return <Heart className="w-6 h-6 text-blue-400" />
      case 'jade': return <Zap className="w-6 h-6 text-purple-400" />
      case 'flora': return <Shield className="w-6 h-6 text-green-400" />
      default: return <Sparkles className="w-6 h-6" />
    }
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Ambient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/20 via-purple-900/10 to-blue-900/20 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-400/30">
                <Phone className="w-4 h-4 text-white" />
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

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full text-white/70 text-sm mb-8 border border-white/10">
            <Sparkles className="w-4 h-4 mr-2" />
            Meet Your AI Team
          </div>
          
          <h1 className="text-6xl lg:text-8xl font-light mb-8 leading-tight">
            Your AI
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Employees
            </span>
          </h1>
          
          <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Three exceptional AI professionals, each with unique expertise 
            and proven excellence in their field.
          </p>
        </div>

        {/* 3D Floating AI Characters */}
        <div className="grid lg:grid-cols-3 gap-12 mb-20 perspective-1000">
          {aiEmployees.map((employee, index) => (
            <div 
              key={employee.id}
              className="relative group cursor-pointer"
              onClick={() => setSelectedEmployee(employee.id)}
              onMouseEnter={() => setHoveredEmployee(employee.id)}
              onMouseLeave={() => setHoveredEmployee(null)}
              style={{
                animationDelay: `${index * 200}ms`,
              }}
            >
              {/* 3D Floating Character Container */}
              <div className={`
                floating-character relative w-80 h-96 mx-auto transform-gpu transition-all duration-700 ease-out
                ${hoveredEmployee === employee.id ? 'scale-110 rotate-y-12' : 'scale-100'}
                ${selectedEmployee === employee.id ? 'selected-glow' : ''}
              `}>
                
                {/* Main Character Body */}
                <div className={`
                  character-body absolute inset-0 rounded-3xl transform-gpu transition-all duration-500
                  bg-gradient-to-br ${employee.color} shadow-2xl ${employee.glowColor}
                  ${hoveredEmployee === employee.id ? 'shadow-3xl' : ''}
                `}>
                  
                  {/* Character Face */}
                  <div className="absolute inset-x-0 top-12 flex justify-center">
                    <div className={`
                      character-head w-32 h-32 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 
                      shadow-xl relative transform-gpu transition-all duration-500
                      ${hoveredEmployee === employee.id ? 'animate-pulse-glow' : ''}
                    `}>
                      
                      {/* Glowing Eyes */}
                      <div className="absolute top-8 left-6 w-6 h-6 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/70 animate-pulse-slow"></div>
                      <div className="absolute top-8 right-6 w-6 h-6 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/70 animate-pulse-slow"></div>
                      
                      {/* VR Headset */}
                      <div className="absolute top-4 inset-x-2 h-12 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg shadow-inner">
                        <div className="absolute top-2 left-2 w-8 h-8 bg-cyan-400/30 rounded border border-cyan-400/50"></div>
                        <div className="absolute top-2 right-2 w-8 h-8 bg-cyan-400/30 rounded border border-cyan-400/50"></div>
                      </div>
                      
                      {/* Headphones */}
                      <div className="absolute -left-4 top-2 w-8 h-16 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full"></div>
                      <div className="absolute -right-4 top-2 w-8 h-16 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full"></div>
                      
                      {/* Antennas */}
                      <div className="absolute -top-2 left-12 w-1 h-8 bg-gradient-to-t from-gray-600 to-cyan-400 rounded-full"></div>
                      <div className="absolute -top-2 right-12 w-1 h-8 bg-gradient-to-t from-gray-600 to-cyan-400 rounded-full"></div>
                      <div className="absolute -top-6 left-11 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/70"></div>
                      <div className="absolute -top-6 right-11 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/70"></div>
                    </div>
                  </div>
                  
                  {/* Character Body */}
                  <div className="absolute bottom-16 inset-x-8">
                    <div className="w-full h-32 bg-gradient-to-b from-gray-700 to-gray-800 rounded-2xl shadow-xl relative">
                      {/* Chest Panel */}
                      <div className="absolute top-4 inset-x-4 h-6 bg-cyan-400/20 rounded border border-cyan-400/30"></div>
                      {/* Power Indicator */}
                      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/70 animate-pulse-slow"></div>
                    </div>
                  </div>
                </div>

                {/* Info Panel */}
                <div className={`
                  info-panel absolute -bottom-8 inset-x-0 transform-gpu transition-all duration-500
                  ${hoveredEmployee === employee.id ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                `}>
                  <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <div className="text-center mb-4">
                      <div className="flex items-center justify-center mb-2">
                        {getEmployeeIcon(employee.id)}
                        <h3 className="text-2xl font-medium text-white ml-3">{employee.name}</h3>
                      </div>
                      <p className="text-white/60">{employee.role}</p>
                      <div className="inline-block px-3 py-1 bg-white/5 rounded-full text-xs text-white/70 mt-2">
                        {employee.specialty}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <p className="text-white/60 text-sm text-center">{employee.personality}</p>
                      <p className="text-white/80 text-sm leading-relaxed">{employee.description}</p>
                      
                      <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-white/70 text-sm italic text-center">
                          "{employee.excellence}"
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleConnect(employee.id)}
                      disabled={isConnecting}
                      className={`
                        w-full py-3 text-base font-medium transition-all duration-300 rounded-xl
                        bg-gradient-to-r ${employee.color} text-black hover:shadow-lg ${employee.glowColor}
                        transform-gpu hover:scale-105
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
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-8 text-sm text-white/50">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse-slow"></div>
              <span>Available 24/7</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse-slow"></div>
              <span>Instant Setup</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse-slow"></div>
              <span>Elite Performance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disney-Level CSS Animations */}
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .floating-character {
          animation: float 6s ease-in-out infinite, sway 8s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        
        .floating-character:nth-child(1) {
          animation-delay: 0s, 0s;
        }
        
        .floating-character:nth-child(2) {
          animation-delay: -2s, -2.5s;
        }
        
        .floating-character:nth-child(3) {
          animation-delay: -4s, -5s;
        }
        
        .character-body {
          transform-style: preserve-3d;
        }
        
        .character-head {
          animation: subtle-bob 4s ease-in-out infinite;
        }
        
        .rotate-y-12 {
          transform: rotateY(12deg) scale(1.1);
        }
        
        .selected-glow {
          filter: drop-shadow(0 0 20px cyan) drop-shadow(0 0 40px cyan);
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        
        .shadow-3xl {
          box-shadow: 0 35px 70px -12px rgba(0, 0, 0, 0.5),
                      0 0 50px rgba(34, 211, 238, 0.3);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateX(0deg); }
          50% { transform: translateY(-20px) rotateX(2deg); }
        }
        
        @keyframes sway {
          0%, 100% { transform: translateX(0px) rotateZ(0deg); }
          25% { transform: translateX(-10px) rotateZ(-1deg); }
          75% { transform: translateX(10px) rotateZ(1deg); }
        }
        
        @keyframes subtle-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 10px currentColor); }
          50% { filter: brightness(1.3) drop-shadow(0 0 20px currentColor); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        
        /* Smooth reveal animation */
        .floating-character {
          animation: float 6s ease-in-out infinite, 
                     sway 8s ease-in-out infinite,
                     reveal 1s ease-out forwards;
          opacity: 0;
          transform: translateY(50px);
        }
        
        @keyframes reveal {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
} 