'use client'

import { useState, useEffect } from 'react'
import { calendarApi } from '@/lib/api-client'

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
  previous: {
    today: { calls: number; bookings: number; revenue: number; conversionRate: number }
    week: { calls: number; bookings: number; revenue: number; conversionRate: number }
    month: { calls: number; bookings: number; revenue: number; conversionRate: number }
  }
}

interface DashboardData {
  metrics: MetricData
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
  systemStatus: {
    voiceAgent: 'online' | 'offline' | 'warning'
    calendarSync: 'connected' | 'disconnected' | 'warning'
    phoneSystem: 'active' | 'inactive' | 'warning'
    lastUpdate: string
  }
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Fetching dashboard data from backend API...')
      
      // Test backend connection first
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      console.log(`🔗 Connecting to backend: ${baseUrl}`)
      
      const connectionTest = await fetch(`${baseUrl}/api/test/connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!connectionTest.ok) {
        throw new Error(`Backend connection failed: ${connectionTest.status} ${connectionTest.statusText}`)
      }
      
      const connectionData = await connectionTest.json()
      console.log('✅ Backend connection successful:', connectionData)

      const token = typeof window !== 'undefined' ? (localStorage.getItem('setup_token') || localStorage.getItem('auth_token') || '') : ''

      // Fetch real metrics from backend
      let metrics: MetricData
      try {
        const metricsResponse = await fetch(`${baseUrl}/api/clients/demo/metrics`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
        })
        
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          metrics = metricsData.metrics
          console.log('📊 Real metrics loaded:', metrics)
        } else {
          console.warn('⚠️ Metrics API failed, using fallback')
          metrics = getFallbackMetrics()
        }
      } catch (metricsError) {
        console.warn('⚠️ Metrics fetch error:', metricsError)
        metrics = getFallbackMetrics()
      }

      // Fetch recent bookings from backend
      let recentBookings: any[]
      try {
        const bookingsResponse = await fetch(`${baseUrl}/api/clients/demo/bookings?limit=5`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        })
        
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json()
          recentBookings = bookingsData.bookings
          console.log('📅 Real bookings loaded:', recentBookings.length, 'bookings')
        } else {
          console.warn('⚠️ Bookings API failed, using fallback')
          recentBookings = getFallbackBookings()
        }
      } catch (bookingsError) {
        console.warn('⚠️ Bookings fetch error:', bookingsError)
        recentBookings = getFallbackBookings()
      }

      // Fetch availability from calendar API
      let availability: any[]
      try {
        const availabilityResponse = await calendarApi.getAvailability({ count: 3 })
        availability = availabilityResponse.slots
        console.log('📅 Calendar availability loaded:', availability.length, 'slots')
      } catch (availabilityError) {
        console.warn('⚠️ Calendar availability error:', availabilityError)
        availability = getFallbackAvailability()
      }

      const dashboardData: DashboardData = {
        metrics,
        availability,
        recentBookings,
        systemStatus: {
          voiceAgent: connectionTest.ok ? 'online' : 'warning',
          calendarSync: availability.length > 0 ? 'connected' : 'warning',
          phoneSystem: 'active',
          lastUpdate: new Date().toISOString()
        }
      }

      console.log('✅ Dashboard data loaded successfully')
      setData(dashboardData)
    } catch (err) {
      console.error('❌ Failed to fetch dashboard data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to load dashboard data: ${errorMessage}`)
      
      // Use complete fallback data
      console.log('🔄 Using fallback data due to error')
      setData({
        metrics: getFallbackMetrics(),
        availability: getFallbackAvailability(),
        recentBookings: getFallbackBookings(),
        systemStatus: {
          voiceAgent: 'warning',
          calendarSync: 'warning',
          phoneSystem: 'warning',
          lastUpdate: new Date().toISOString()
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    console.log('🔄 Manual refresh triggered')
    await fetchData()
  }

  useEffect(() => {
    fetchData()
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      console.log('⏱️ Auto-refresh triggered')
      fetchData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return {
    metrics: data?.metrics,
    availability: data?.availability,
    recentBookings: data?.recentBookings,
    systemStatus: data?.systemStatus,
    loading,
    error,
    selectedPeriod,
    setSelectedPeriod,
    refreshData
  }
}

// Fallback data functions
function getFallbackMetrics(): MetricData {
  console.log('📊 Using fallback metrics data')
  return {
    today: {
      calls: 12,
      bookings: 8,
      revenue: 1240,
      conversionRate: 67
    },
    week: {
      calls: 85,
      bookings: 56,
      revenue: 8960,
      conversionRate: 66
    },
    month: {
      calls: 342,
      bookings: 234,
      revenue: 34560,
      conversionRate: 68
    },
    previous: {
      today: { calls: 10, bookings: 6, revenue: 960, conversionRate: 60 },
      week: { calls: 78, bookings: 48, revenue: 7680, conversionRate: 62 },
      month: { calls: 310, bookings: 201, revenue: 30150, conversionRate: 65 }
    }
  }
}

function getFallbackAvailability() {
  console.log('📅 Using fallback availability data')
  return [
    { start: '2025-01-15T14:00:00Z', end: '2025-01-15T14:30:00Z' },
    { start: '2025-01-15T15:00:00Z', end: '2025-01-15T15:30:00Z' },
    { start: '2025-01-15T16:00:00Z', end: '2025-01-15T16:30:00Z' }
  ]
}

function getFallbackBookings() {
  console.log('📅 Using fallback bookings data')
  return [
    {
      id: 'book_1',
      customerName: 'Sarah Johnson',
      service: 'Consultation',
      time: '2025-01-15T14:00:00Z',
      duration: 30,
      status: 'confirmed'
    },
    {
      id: 'book_2',
      customerName: 'Mike Chen',
      service: 'Haircut',
      time: '2025-01-15T15:30:00Z',
      duration: 45,
      status: 'confirmed'
    },
    {
      id: 'book_3',
      customerName: 'Lisa Park',
      service: 'Styling',
      time: '2025-01-15T16:00:00Z',
      duration: 60,
      status: 'pending'
    }
  ]
} 