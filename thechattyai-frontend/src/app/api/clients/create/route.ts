import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

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
    
    // Generate JWT token for the new client
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'
    const apiKey = generateApiKey()
    
    const token = jwt.sign(
      { api_key: apiKey, client_id: generateClientId() },
      jwtSecret,
      { expiresIn: '365d' }
    )

    // Store client data (you would save this to your database)
    const newClient = {
      id: generateClientId(),
      businessName: clientData.businessName,
      businessType: clientData.businessType,
      ownerName: clientData.ownerName,
      email: clientData.email,
      phone: clientData.phone,
      address: clientData.address,
      description: clientData.description,
      services: clientData.services || [],
      workingHours: clientData.workingHours || { start: '09:00', end: '17:00' },
      timeZone: clientData.timeZone || 'America/Los_Angeles',
      apiKey,
      jwtToken: token,
      createdAt: new Date().toISOString(),
      status: 'setup_pending'
    }

    // Send notification email to admin (you)
    await sendNotificationEmail(newClient)

    return NextResponse.json({
      success: true,
      client: {
        id: newClient.id,
        businessName: newClient.businessName,
        email: newClient.email,
        status: newClient.status
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