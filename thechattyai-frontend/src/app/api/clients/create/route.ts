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
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://chattyai-backend-clean.onrender.com'
    
    console.log('🚀 Calling backend at:', backendUrl)

    // Call backend endpoint to create client & get JWT
    const createRes = await fetch(`${backendUrl}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use a demo JWT token for authentication
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiZGVtbyIsImNsaWVudF9pZCI6ImRlbW8tY2xpZW50IiwiYnVzaW5lc3NfbmFtZSI6IkRlbW8gQnVzaW5lc3MiLCJlbWFpbCI6ImRlbW9AYnVzaW5lc3MuY29tIiwiaWF0IjoxNzUyMDg3NzA0LCJleHAiOjE3ODM2NDUzMDR9.demo'
      },
      body: JSON.stringify(clientData)
    })

    if (!createRes.ok) {
      const text = await createRes.text()
      console.error('Backend client creation error:', text)
      return NextResponse.json({ error: 'Failed to create client in backend' }, { status: 500 })
    }

    const createData = await createRes.json()

    // Expected response shape: { success, client, credentials: { jwtToken, apiKey } }
    const { credentials } = createData
    const token = credentials?.jwtToken

    // Simple notification log
    console.log('🔔 NEW CLIENT SIGNUP (backend):', {
      business: clientData.businessName,
      owner: clientData.ownerName,
      email: clientData.email,
      clientId: createData.client?.id,
      tokenPreview: token?.substring(0, 20) + '...'
    })

    return NextResponse.json({
      success: true,
      client: createData.client,
      jwt_token: token,
      client_id: createData.client?.id,
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