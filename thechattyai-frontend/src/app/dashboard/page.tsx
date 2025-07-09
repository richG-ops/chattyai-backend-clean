'use client'

import { useDashboardData } from '@/hooks/use-dashboard-data'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
  LogOut
} from 'lucide-react'
import Link from 'next/link'

interface MetricData {
  today: {
    calls: number
    bookings: number
    revenue: number
    conversionRate: number
  }
  week: {
    calls: number
    bookings: number
    revenue: number
    conversionRate: number
  }
  month: {
    calls: number
    bookings: number
    revenue: number
    conversionRate: number
  }
  availability: Array<{
    start: string
    end: string
  }>
  recentBookings: Array<{
    id: string
    customerName: string
    service: string
    time: string
    duration: number
    status: string
  }>
  callTrends: {
    labels: string[]
    data: number[]
  }
  bookingTrends: {
    labels: string[]
    data: number[]
  }
}

export default function DashboardPage() {
  const {
    metrics,
    availability,
    recentBookings,
    systemStatus,
    loading,
    error,
    selectedPeriod,
    setSelectedPeriod,
    refreshData
  } = useDashboardData()

  const currentMetrics = metrics ? metrics[selectedPeriod] : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refreshData}>Try Again</Button>
        </div>
      </div>
    )
  }

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
                  TheChattyAI
                </h1>
                <p className="text-sm text-gray-400">AI-Powered Business Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 relative">
                <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              </Button>
              </div>
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
        {/* Period Selector */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              AI Performance Dashboard
            </h2>
            <p className="text-gray-300 mt-2">Real-time insights from your AI assistant</p>
          </div>
          
          <div className="flex space-x-2 bg-white/5 backdrop-blur-sm rounded-xl p-1">
            {(['today', 'week', 'month'] as const).map((period) => (
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

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-blue-500/40 to-purple-600/40 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-blue-500/50 hover:from-blue-500/60 hover:to-purple-600/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                AI Calls {selectedPeriod === 'today' ? 'Today' : `This ${selectedPeriod}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">{currentMetrics?.calls || 0}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-300 mr-1" />
                  <span className="text-sm text-green-300 font-medium">+15% from last {selectedPeriod}</span>
                </div>
                <div className="text-xs text-gray-200 font-medium">Live</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-green-500/40 to-emerald-600/40 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-green-500/50 hover:from-green-500/60 hover:to-emerald-600/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                Bookings {selectedPeriod === 'today' ? 'Today' : `This ${selectedPeriod}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">{currentMetrics?.bookings || 0}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-300 mr-1" />
                  <span className="text-sm text-green-300 font-medium">+23% from last {selectedPeriod}</span>
                </div>
                <div className="text-xs text-gray-200 font-medium">Auto</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-500/40 to-pink-600/40 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-purple-500/50 hover:from-purple-500/60 hover:to-pink-600/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                Revenue {selectedPeriod === 'today' ? 'Today' : `This ${selectedPeriod}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">${currentMetrics?.revenue?.toLocaleString() || 0}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-300 mr-1" />
                  <span className="text-sm text-green-300 font-medium">+18% from last {selectedPeriod}</span>
                </div>
                <div className="text-xs text-gray-200 font-medium">USD</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-yellow-500/40 to-orange-600/40 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-yellow-500/50 hover:from-yellow-500/60 hover:to-orange-600/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                AI Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">{currentMetrics?.conversionRate || 0}%</div>
              <div className="w-full bg-white/20 rounded-full h-3 mt-2">
                <div 
                  className="bg-gradient-to-r from-yellow-300 to-orange-400 h-3 rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${currentMetrics?.conversionRate || 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New 2025 AI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-cyan-500/40 to-teal-600/40 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-cyan-500/50 hover:from-cyan-500/60 hover:to-teal-600/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-teal-600 rounded-lg flex items-center justify-center mr-3">
                  <Users className="w-4 h-4 text-white" />
                </div>
                AI Sentiment Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">94.5%</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-300 mr-1" />
                  <span className="text-sm text-green-300 font-medium">+2.3% improvement</span>
                </div>
                <div className="text-xs text-gray-200 font-medium">Positive</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-indigo-500/40 to-blue-600/40 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-indigo-500/50 hover:from-indigo-500/60 hover:to-blue-600/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                Avg Call Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">2m 34s</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-300 mr-1" />
                  <span className="text-sm text-green-300 font-medium">Optimal length</span>
                </div>
                <div className="text-xs text-gray-200 font-medium">Live</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-rose-500/40 to-red-600/40 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-rose-500/50 hover:from-rose-500/60 hover:to-red-600/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-rose-400 to-red-600 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                Voice Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">99.2%</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-300 mr-1" />
                  <span className="text-sm text-green-300 font-medium">+0.8% today</span>
                </div>
                <div className="text-xs text-gray-200 font-medium">AI</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-500/40 to-green-600/40 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-emerald-500/50 hover:from-emerald-500/60 hover:to-green-600/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-green-600 rounded-lg flex items-center justify-center mr-3">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                Customer Satisfaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white mb-2">4.8/5</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-green-300 mr-1" />
                  <span className="text-sm text-green-300 font-medium">+0.2 this week</span>
                </div>
                <div className="text-xs text-gray-200 font-medium">CSAT</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 border-0 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:bg-white/15 hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                AI Performance Analytics
              </CardTitle>
              <CardDescription className="text-gray-200">Real-time insights and trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-xl border border-white/5">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white font-bold text-lg mb-2">Advanced Analytics Coming Soon</p>
                  <p className="text-sm text-gray-200 font-medium">
                    Real-time charts with AI insights, conversion funnels, and predictive analytics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:bg-white/15 hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                System Status
              </CardTitle>
              <CardDescription className="text-gray-200">Real-time system health monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-lg border border-green-500/30 hover:border-green-500/40 hover:from-green-500/30 hover:to-emerald-600/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-300 rounded-full mr-3 animate-pulse"></div>
                  <span className="text-sm text-white font-medium">Voice Agent AI</span>
                </div>
                <span className="text-sm font-medium text-green-300">Online</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/20 to-cyan-600/20 rounded-lg border border-blue-500/30 hover:border-blue-500/40 hover:from-blue-500/30 hover:to-cyan-600/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mr-3 animate-pulse"></div>
                  <span className="text-sm text-white font-medium">Calendar Sync</span>
                </div>
                <span className="text-sm font-medium text-blue-300">Connected</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/20 to-pink-600/20 rounded-lg border border-purple-500/30 hover:border-purple-500/40 hover:from-purple-500/30 hover:to-pink-600/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-300 rounded-full mr-3 animate-pulse"></div>
                  <span className="text-sm text-white font-medium">Phone System</span>
                </div>
                <span className="text-sm font-medium text-purple-300">Active</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/20 to-orange-600/20 rounded-lg border border-yellow-500/30 hover:border-yellow-500/40 hover:from-yellow-500/30 hover:to-orange-600/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-300 rounded-full mr-3"></div>
                  <span className="text-sm text-white font-medium">Last Update</span>
                </div>
                <span className="text-sm font-medium text-yellow-300">Live</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:bg-white/15 hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                Recent AI Bookings
              </CardTitle>
              <CardDescription className="text-gray-200">Latest appointments scheduled by your AI assistant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBookings?.map((booking, index) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white/10 to-white/15 rounded-xl border border-white/20 hover:border-white/30 hover:from-white/20 hover:to-white/25 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{booking.customerName}</p>
                        <p className="text-sm text-gray-200 font-medium">{booking.service}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {new Date(booking.time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl hover:bg-white/15 hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                Available Slots
              </CardTitle>
              <CardDescription className="text-gray-200">Next available appointments for booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availability?.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-white/10 to-white/15 rounded-xl border border-white/20 hover:border-white/30 hover:from-white/20 hover:to-white/25 hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white">
                          {new Date(slot.start).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-sm text-gray-200 font-medium">30 minutes available</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 hover:from-cyan-600 hover:to-blue-700 shadow-lg hover:shadow-cyan-500/25 transition-all duration-200"
                    >
                      Book Now
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 