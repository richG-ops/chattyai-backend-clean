import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // For demo purposes, we'll allow demo@business.com without password
    // In production, you'd verify against your database
    if (email === 'demo@business.com') {
      // Generate JWT token for demo user
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
      const demoClient = {
        id: 'demo-client',
        email: 'demo@business.com',
        businessName: 'Demo Business',
        ownerName: 'Demo Owner',
        businessType: 'salon',
        apiKey: 'demo-api-key'
      }
      
      const token = jwt.sign(
        { 
          client_id: demoClient.id,
          email: demoClient.email,
          business_name: demoClient.businessName,
          api_key: demoClient.apiKey
        },
        jwtSecret,
        { expiresIn: '7d' }
      )

      return NextResponse.json({
        success: true,
        token,
        client: demoClient
      })
    }

    // For real authentication, try to connect to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    
    try {
      // Check if backend is available
      const healthRes = await fetch(`${backendUrl}/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!healthRes.ok) {
        throw new Error('Backend not available')
      }
      
      // In production, you would have a proper authentication endpoint
      // For now, we'll use a simple email-based lookup
      
      // Generate a token for any valid email (simplified for demo)
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
      const clientId = `client_${Date.now()}`
      
      const token = jwt.sign(
        { 
          client_id: clientId,
          email: email,
          business_name: 'User Business',
          api_key: `api_${Date.now()}`
        },
        jwtSecret,
        { expiresIn: '7d' }
      )

      return NextResponse.json({
        success: true,
        token,
        client: {
          id: clientId,
          email: email,
          businessName: 'User Business',
          ownerName: 'User',
          businessType: 'service'
        }
      })
      
    } catch (backendError) {
      console.warn('Backend not available, using demo mode:', backendError)
      
      // Fallback to demo mode if backend is not available
      return NextResponse.json(
        { error: 'Backend not available. Please try the demo account: demo@business.com' },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    
    const decoded = jwt.verify(token, jwtSecret) as any
    
    return NextResponse.json({
      success: true,
      client: {
        id: decoded.client_id,
        email: decoded.email,
        businessName: decoded.business_name,
        apiKey: decoded.api_key
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
} 