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

    // For demo purposes, we'll use a simple authentication
    // In production, you'd verify against your database
    const mockClients = [
      {
        id: 'client_demo_123',
        email: 'demo@business.com',
        businessName: 'Demo Business',
        ownerName: 'Demo Owner',
        businessType: 'salon'
      }
    ]

    const client = mockClients.find(c => c.email === email)
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    const token = jwt.sign(
      { 
        client_id: client.id,
        email: client.email,
        business_name: client.businessName
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      success: true,
      token,
      client: {
        id: client.id,
        email: client.email,
        businessName: client.businessName,
        ownerName: client.ownerName,
        businessType: client.businessType
      }
    })

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
        businessName: decoded.business_name
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
} 