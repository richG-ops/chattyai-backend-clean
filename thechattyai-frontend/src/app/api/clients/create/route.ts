import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const clientData = await request.json()
    
    // Validate required fields
    const requiredFields = ['businessName', 'businessType', 'ownerName', 'email', 'phone']
    const missingFields = requiredFields.filter(field => !clientData[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Create client in your existing backend
    const backendUrl = process.env.CALENDAR_API_URL || 'http://localhost:4000'

    // Call backend endpoint to create tenant & get JWT
    const setupRes = await fetch(`${backendUrl}/setup-tenant-once`, {
      method: 'GET'
    })

    if (!setupRes.ok) {
      const text = await setupRes.text()
      console.error('Backend setup error:', text)
      return NextResponse.json({ error: 'Backend setup failed' }, { status: 500 })
    }

    const setupData = await setupRes.json()

    // Expected response shape: { jwt_token, message }
    const { jwt_token: token } = setupData

    // Simple notification log
    console.log('🔔 NEW CLIENT SIGNUP (backend):', {
      business: clientData.businessName,
      owner: clientData.ownerName,
      email: clientData.email,
      tokenPreview: token?.substring(0, 20) + '...'
    })

    return NextResponse.json({
      success: true,
      client: {
        businessName: clientData.businessName,
        email: clientData.email,
        status: 'setup_pending'
      },
      jwtToken: token,
      message: 'Client created successfully! Setup will be completed within 30 minutes.'
    })
     
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}

function generateApiKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateClientId(): string {
  return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

async function sendNotificationEmail(client: any) {
  // Here you would integrate with your email service
  // For now, we'll just log it
  console.log('🔔 NEW CLIENT SIGNUP:', {
    business: client.businessName,
    owner: client.ownerName,
    email: client.email,
    phone: client.phone,
    type: client.businessType,
    timestamp: new Date().toISOString()
  })
  
  // You could integrate with SendGrid, Mailgun, etc.
  // const emailService = new EmailService()
  // await emailService.send({
  //   to: 'admin@thechattyai.com',
  //   subject: `New Client Signup: ${client.businessName}`,
  //   template: 'new-client-notification',
  //   data: client
  // })
} 