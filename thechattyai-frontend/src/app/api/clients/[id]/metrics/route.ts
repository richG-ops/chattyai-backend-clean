import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as any
      
      // Verify client access
      if (decoded.client_id !== clientId) {
        return NextResponse.json(
          { error: 'Unauthorized access to client data' },
          { status: 403 }
        )
      }
    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Fetch metrics from your calendar API
    const backendUrl = process.env.CALENDAR_API_URL || 'http://localhost:4000'
    const backendJWT = process.env.CALENDAR_API_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFiYTE2OGRkMzBjMDM3N2MxZjBjNzRiOTM2ZjQyNzQiLCJpYXQiOjE3NTIwMDgzNjcsImV4cCI6MTc4MzU0NDM2N30.zelpVbu-alSaAfMSkSsne2gaaWETqdbakzui5Pbi_Ts'
    
    // Get availability data
    const availabilityResponse = await fetch(`${backendUrl}/get-availability`, {
      headers: {
        'Authorization': `Bearer ${backendJWT}`,
        'Content-Type': 'application/json'
      }
    })
    
    const availabilityData = await availabilityResponse.json()
    
    // Generate mock metrics based on real data
    const mockMetrics = {
      today: {
        calls: Math.floor(Math.random() * 20) + 5,
        bookings: Math.floor(Math.random() * 15) + 3,
        revenue: Math.floor(Math.random() * 2000) + 500,
        conversionRate: Math.floor(Math.random() * 30) + 60 // 60-90%
      },
      week: {
        calls: Math.floor(Math.random() * 100) + 50,
        bookings: Math.floor(Math.random() * 80) + 20,
        revenue: Math.floor(Math.random() * 10000) + 3000,
        conversionRate: Math.floor(Math.random() * 25) + 65
      },
      month: {
        calls: Math.floor(Math.random() * 500) + 200,
        bookings: Math.floor(Math.random() * 400) + 100,
        revenue: Math.floor(Math.random() * 50000) + 15000,
        conversionRate: Math.floor(Math.random() * 20) + 70
      },
      availability: availabilityData.slots || [],
      recentBookings: [
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
        }
      ],
      callTrends: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [12, 15, 8, 22, 18, 25, 14]
      },
      bookingTrends: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [8, 12, 6, 18, 14, 20, 10]
      }
    }

    return NextResponse.json({
      success: true,
      metrics: mockMetrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching client metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
} 