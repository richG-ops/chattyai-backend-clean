'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Phone, 
  BarChart3, 
  Heart,
  Zap,
  Shield,
  Activity,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

interface AIEmployeeMetrics {
  id: string
  name: string
  avatar: string
  status: 'active' | 'available' | 'standby'
  todayHighlight: {
    metric: string
    value: string
    context: string
  }
  recentWin: {
    achievement: string
    time: string
  }
  currentFocus: string
}

export default function EmployeeDashboardPage() {
  const [employees, setEmployees] = useState<AIEmployeeMetrics[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('luna')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      const employeeData: AIEmployeeMetrics[] = [
        {
          id: 'luna',
          name: 'Luna',
          avatar: '👩‍💼',
          status: 'active',
          todayHighlight: {
            metric: 'Customer Satisfaction',
            value: '4.9/5',
            context: 'Exceptional performance today'
          },
          recentWin: {
            achievement: 'Resolved complex scheduling conflict',
            time: '2 hours ago'
          },
          currentFocus: 'Optimizing customer experience flow'
        },
        {
          id: 'jade',
          name: 'Jade',
          avatar: '💎',
          status: 'active',
          todayHighlight: {
            metric: 'Lead Quality',
            value: '89%',
            context: 'Above excellence threshold'
          },
          recentWin: {
            achievement: 'Qualified high-value enterprise lead',
            time: '1 hour ago'
          },
          currentFocus: 'Refining qualification strategies'
        },
        {
          id: 'flora',
          name: 'Flora',
          avatar: '🌸',
          status: 'active',
          todayHighlight: {
            metric: 'Process Efficiency',
            value: '99.2%',
            context: 'Maintaining peak performance'
          },
          recentWin: {
            achievement: 'Coordinated 3-location scheduling',
            time: '30 minutes ago'
          },
          currentFocus: 'Perfecting multi-location workflows'
        }
      ]
      
      setEmployees(employeeData)
      setLoading(false)
    }, 800)
  }, [])

  const getEmployeeIcon = (employeeId: string) => {
    switch(employeeId) {
      case 'luna': return <Heart className="w-5 h-5 text-blue-400" />
      case 'jade': return <Zap className="w-5 h-5 text-purple-400" />
      case 'flora': return <Shield className="w-5 h-5 text-green-400" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-400'
      case 'available': return 'bg-blue-400'
      case 'standby': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading team performance...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/20 via-purple-900/10 to-blue-900/20 pointer-events-none" />
      
      <header className="relative z-10 border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-medium">AI Team Performance</h1>
                <p className="text-sm text-white/50">Real-time insights</p>
              </div>
            </div>
            
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full text-white/70 text-sm mb-6 border border-white/10">
            <Sparkles className="w-4 h-4 mr-2" />
            Live Performance
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-light mb-6 leading-tight">
            Your AI Team
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Excellence
            </span>
          </h1>
          
          <p className="text-xl text-white/60 max-w-2xl leading-relaxed">
            Real-time insights from your AI employees, 
            performing at the highest level around the clock.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {employees.map((employee, index) => (
            <Card 
              key={employee.id}
              className={`
                group relative border-0 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl 
                transition-all duration-500 cursor-pointer hover:scale-[1.02] hover:bg-white/10
                ${selectedEmployee === employee.id ? 'ring-1 ring-white/20 bg-white/10' : ''}
              `}
              onClick={() => setSelectedEmployee(employee.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{employee.avatar}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        {getEmployeeIcon(employee.id)}
                        <h3 className="text-lg font-medium text-white">{employee.name}</h3>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(employee.status)}`}></div>
                        <span className="text-sm text-white/50 capitalize">{employee.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-white/50 mb-1">{employee.todayHighlight.metric}</div>
                  <div className="text-2xl font-light text-white mb-1">{employee.todayHighlight.value}</div>
                  <div className="text-xs text-white/40">{employee.todayHighlight.context}</div>
                </div>

                <div className="p-3 bg-white/5 rounded-lg mb-4">
                  <div className="text-sm text-white/70 mb-1">Recent Achievement</div>
                  <div className="text-sm text-white/90 mb-1">{employee.recentWin.achievement}</div>
                  <div className="text-xs text-white/40">{employee.recentWin.time}</div>
                </div>

                <div className="text-sm text-white/60">
                  <span className="text-white/40">Currently: </span>
                  {employee.currentFocus}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center text-xl font-medium">
              <BarChart3 className="w-5 h-5 mr-3 text-blue-400" />
              System Performance
            </CardTitle>
            <CardDescription className="text-white/50">
              All systems operating at peak efficiency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <div className="text-2xl font-light text-white mb-1">100%</div>
                <div className="text-sm text-white/50">Uptime</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <div className="text-2xl font-light text-white mb-1">&lt; 50ms</div>
                <div className="text-sm text-white/50">Response Time</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <div className="text-2xl font-light text-white mb-1">99.9%</div>
                <div className="text-sm text-white/50">Accuracy</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <div className="text-2xl font-light text-white mb-1">24/7</div>
                <div className="text-sm text-white/50">Availability</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center mt-12">
          <Link href="/ai-employee-selection">
            <Button className="bg-white text-black hover:bg-white/90 px-8 py-3 rounded-xl font-medium">
              Manage Team
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 