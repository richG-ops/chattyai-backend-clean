'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Phone, 
  Calendar, 
  BarChart3, 
  Users, 
  TrendingUp, 
  Clock, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Settings,
  Bell,
  LogOut,
  Heart,
  Zap,
  Shield,
  Award,
  Star,
  Coffee,
  MessageCircle,
  Target
} from 'lucide-react'
import Link from 'next/link'
import { calendarApi } from '@/lib/api-client'

interface AIEmployeeStats {
  id: string
  name: string
  avatar: string
  status: 'active' | 'break' | 'offline'
  todayStats: {
    callsHandled: number
    bookingsComplete: number
    revenue: number
    satisfaction: number
    hoursWorked: number
  }
  weekStats: {
    callsHandled: number
    bookingsComplete: number
    revenue: number
    satisfaction: number
    hoursWorked: number
  }
  recentActivity: Array<{
    time: string
    action: string
    customer: string
    outcome: 'success' | 'pending' | 'escalated'
  }>
  personalityNotes: string[]
  performanceBonus: number
  nextGoal: string
}

export default function EmployeeDashboardPage() {
  const [employees, setEmployees] = useState<AIEmployeeStats[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('luna')
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week'>('today')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEmployeeData()
  }, [])

  const fetchEmployeeData = async () => {
    setLoading(true)
    try {
      // Simulate API call to get AI employee performance data
      const employeeData: AIEmployeeStats[] = [
        {
          id: 'luna',
          name: 'Luna',
          avatar: '👩‍💼',
          status: 'active',
          todayStats: {
            callsHandled: 47,
            bookingsComplete: 31,
            revenue: 4650,
            satisfaction: 4.9,
            hoursWorked: 8.5
          },
          weekStats: {
            callsHandled: 312,
            bookingsComplete: 234,
            revenue: 35200,
            satisfaction: 4.8,
            hoursWorked: 56
          },
          recentActivity: [
            { time: '2:47 PM', action: 'Resolved complaint', customer: 'Sarah M.', outcome: 'success' },
            { time: '2:23 PM', action: 'Booked appointment', customer: 'Mike R.', outcome: 'success' },
            { time: '1:58 PM', action: 'Rescheduled appointment', customer: 'Lisa P.', outcome: 'success' },
            { time: '1:34 PM', action: 'Complex inquiry', customer: 'David K.', outcome: 'escalated' }
          ],
          personalityNotes: [
            'Exceptionally patient with difficult customers',
            'Always follows up on promises made',
            'Great at de-escalating tense situations'
          ],
          performanceBonus: 125,
          nextGoal: 'Maintain 95% satisfaction for 30 days'
        },
        {
          id: 'jade',
          name: 'Jade', 
          avatar: '💎',
          status: 'active',
          todayStats: {
            callsHandled: 23,
            bookingsComplete: 19,
            revenue: 8950,
            satisfaction: 4.7,
            hoursWorked: 6.2
          },
          weekStats: {
            callsHandled: 156,
            bookingsComplete: 127,
            revenue: 47600,
            satisfaction: 4.6,
            hoursWorked: 42
          },
          recentActivity: [
            { time: '3:12 PM', action: 'Qualified hot lead', customer: 'Jennifer C.', outcome: 'success' },
            { time: '2:45 PM', action: 'Closed high-value sale', customer: 'Robert T.', outcome: 'success' },
            { time: '2:18 PM', action: 'Objection handling', customer: 'Emma L.', outcome: 'success' },
            { time: '1:52 PM', action: 'Lead qualification', customer: 'Alex M.', outcome: 'pending' }
          ],
          personalityNotes: [
            'Excellent at identifying decision makers',
            'Asks the right qualifying questions',
            'Never pressures, always consultative'
          ],
          performanceBonus: 275,
          nextGoal: 'Achieve 70% lead conversion rate'
        },
        {
          id: 'flora',
          name: 'Flora',
          avatar: '🌸',
          status: 'break',
          todayStats: {
            callsHandled: 65,
            bookingsComplete: 58,
            revenue: 3200,
            satisfaction: 4.9,
            hoursWorked: 7.8
          },
          weekStats: {
            callsHandled: 487,
            bookingsComplete: 445,
            revenue: 22800,
            satisfaction: 4.9,
            hoursWorked: 53
          },
          recentActivity: [
            { time: '3:05 PM', action: 'Multi-location scheduling', customer: 'Dr. Wilson', outcome: 'success' },
            { time: '2:41 PM', action: 'Insurance verification', customer: 'Maria G.', outcome: 'success' },
            { time: '2:15 PM', action: 'Conflict resolution', customer: 'Tom H.', outcome: 'success' },
            { time: '1:47 PM', action: 'Emergency scheduling', customer: 'Anna K.', outcome: 'success' }
          ],
          personalityNotes: [
            'Incredibly organized and detail-oriented',
            'Handles complex scheduling like a pro',
            'Patients love her thoroughness'
          ],
          performanceBonus: 95,
          nextGoal: 'Process 500+ calls with 99% accuracy'
        }
      ]
      
      setEmployees(employeeData)
    } catch (error) {
      console.error('Error fetching employee data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSelectedEmployee = () => {
    return employees.find(emp => emp.id === selectedEmployee) || employees[0]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'break': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Handling calls'
      case 'break': return 'On break'
      case 'offline': return 'Offline'
      default: return 'Unknown'
    }
  }

  const getEmployeeIcon = (employeeId: string) => {
    switch(employeeId) {
      case 'luna': return <Heart className="w-5 h-5 text-blue-500" />
      case 'jade': return <Zap className="w-5 h-5 text-purple-500" />
      case 'flora': return <Shield className="w-5 h-5 text-green-500" />
      default: return <Users className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading your AI team performance...</p>
        </div>
      </div>
    )
  }

  const employee = getSelectedEmployee()
  const stats = selectedPeriod === 'today' ? employee?.todayStats : employee?.weekStats

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  AI Employee Performance Center
                </h1>
                <p className="text-sm text-gray-400">Managing your AI team</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Employee Selector */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-6">Your AI Team</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <Card 
                key={emp.id}
                className={`
                  border-0 backdrop-blur-xl shadow-xl cursor-pointer transition-all duration-300
                  ${selectedEmployee === emp.id 
                    ? 'bg-white/20 ring-2 ring-blue-400 scale-105' 
                    : 'bg-white/10 hover:bg-white/15'
                  }
                `}
                onClick={() => setSelectedEmployee(emp.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{emp.avatar}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {getEmployeeIcon(emp.id)}
                        <h3 className="text-lg font-semibold text-white">{emp.name}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(emp.status)}`}></div>
                        <span className="text-sm text-gray-300">{getStatusText(emp.status)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {selectedPeriod === 'today' ? emp.todayStats.callsHandled : emp.weekStats.callsHandled}
                      </div>
                      <div className="text-xs text-gray-300">
                        calls {selectedPeriod}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-bold text-white">
              {employee?.name}'s Performance {employee?.avatar}
            </h2>
            <p className="text-gray-300 mt-2">Real-time insights from your AI employee</p>
          </div>
          
          <div className="flex space-x-2 bg-white/5 backdrop-blur-sm rounded-xl p-1">
            {(['today', 'week'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'ghost'}
                onClick={() => setSelectedPeriod(period)}
                className={`capitalize transition-all duration-200 ${
                  selectedPeriod === period 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-blue-500/40 to-purple-600/40 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Calls Handled</p>
                  <p className="text-3xl font-bold text-white">{stats?.callsHandled}</p>
                </div>
                <Phone className="w-8 h-8 text-white/60" />
              </div>
              <div className="mt-2">
                <span className="text-green-300 text-sm">+12% vs last {selectedPeriod}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-500/40 to-emerald-600/40 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Bookings</p>
                  <p className="text-3xl font-bold text-white">{stats?.bookingsComplete}</p>
                </div>
                <Calendar className="w-8 h-8 text-white/60" />
              </div>
              <div className="mt-2">
                <span className="text-green-300 text-sm">+18% vs last {selectedPeriod}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-500/40 to-pink-600/40 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Revenue</p>
                  <p className="text-3xl font-bold text-white">${stats?.revenue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-white/60" />
              </div>
              <div className="mt-2">
                <span className="text-green-300 text-sm">+24% vs last {selectedPeriod}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-yellow-500/40 to-orange-600/40 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Satisfaction</p>
                  <p className="text-3xl font-bold text-white">{stats?.satisfaction}/5</p>
                </div>
                <Star className="w-8 h-8 text-white/60" />
              </div>
              <div className="mt-2">
                <span className="text-green-300 text-sm">⭐ Excellent</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-cyan-500/40 to-teal-600/40 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Hours Worked</p>
                  <p className="text-3xl font-bold text-white">{stats?.hoursWorked}h</p>
                </div>
                <Clock className="w-8 h-8 text-white/60" />
              </div>
              <div className="mt-2">
                <span className="text-blue-300 text-sm">Always available</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Bonus & Goals */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-400" />
                Performance Bonus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400 mb-2">
                  +${employee?.performanceBonus}
                </div>
                <p className="text-gray-300 text-sm">
                  Earned this month for exceptional performance
                </p>
                <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    🎉 {employee?.name} exceeded satisfaction goals!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-400" />
                Current Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-white font-medium mb-4">
                  {employee?.nextGoal}
                </p>
                <Progress value={85} className="mb-2" />
                <p className="text-gray-300 text-sm">
                  85% progress toward goal
                </p>
                <div className="mt-4">
                  <Badge className="bg-blue-500/20 text-blue-300">
                    On track to succeed
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Coffee className="w-5 h-5 mr-2 text-green-400" />
                Employee Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employee?.personalityNotes.map((note, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                    <p className="text-gray-300 text-sm">{note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-0 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-blue-400" />
              {employee?.name}'s Recent Activity
            </CardTitle>
            <CardDescription className="text-gray-300">
              Latest interactions and outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employee?.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-400">{activity.time}</div>
                    <div className="text-white font-medium">{activity.action}</div>
                    <div className="text-gray-300">with {activity.customer}</div>
                  </div>
                  <Badge 
                    className={
                      activity.outcome === 'success' ? 'bg-green-500/20 text-green-400' :
                      activity.outcome === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }
                  >
                    {activity.outcome}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 