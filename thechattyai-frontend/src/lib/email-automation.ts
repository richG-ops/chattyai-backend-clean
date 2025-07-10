interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface ClientData {
  businessName: string
  ownerName: string
  email: string
  businessType: string
  clientId: string
}

export class EmailAutomation {
  private apiKey: string
  private fromEmail: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || ''
    this.fromEmail = 'noreply@thechattyai.com'
  }

  // Welcome email sequence
  async sendWelcomeEmail(clientData: ClientData): Promise<boolean> {
    const template = this.getWelcomeTemplate(clientData)
    return await this.sendEmail(clientData.email, template)
  }

  // Setup completion email
  async sendSetupCompleteEmail(clientData: ClientData): Promise<boolean> {
    const template = this.getSetupCompleteTemplate(clientData)
    return await this.sendEmail(clientData.email, template)
  }

  // Next steps email (24 hours later)
  async sendNextStepsEmail(clientData: ClientData): Promise<boolean> {
    const template = this.getNextStepsTemplate(clientData)
    return await this.sendEmail(clientData.email, template)
  }

  // Phone setup reminder (48 hours later)
  async sendPhoneSetupReminder(clientData: ClientData): Promise<boolean> {
    const template = this.getPhoneSetupTemplate(clientData)
    return await this.sendEmail(clientData.email, template)
  }

  private async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      })

      return response.ok
    } catch (error) {
      console.error('Email sending failed:', error)
      return false
    }
  }

  private getWelcomeTemplate(client: ClientData): EmailTemplate {
    return {
      subject: `Welcome to TheChattyAI, ${client.ownerName}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to TheChattyAI! 🎉</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">
              Your AI voice agent is being set up
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937;">Hi ${client.ownerName},</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Thank you for choosing TheChattyAI for ${client.businessName}! We're excited to help you automate your appointment booking with AI.
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">What's happening now:</h3>
              <ul style="color: #4b5563; margin: 0;">
                <li>✅ Your account has been created</li>
                <li>🔄 AI agent is being configured for ${client.businessType}</li>
                <li>📅 Calendar integration is being set up</li>
                <li>📞 Phone number assignment (coming soon)</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://thechattyai-frontend-fax40bwnq-richards-projects-db77a6cf.vercel.app/dashboard" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Your Dashboard
              </a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              We'll send you another email once your AI agent is ready to start taking calls. This usually takes 30-60 minutes.
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Questions? Just reply to this email - we're here to help!
            </p>
            
            <p style="color: #4b5563;">
              Best regards,<br>
              The TheChattyAI Team
            </p>
          </div>
        </div>
      `,
      text: `
        Welcome to TheChattyAI, ${client.ownerName}!
        
        Thank you for choosing TheChattyAI for ${client.businessName}!
        
        What's happening now:
        ✅ Your account has been created
        🔄 AI agent is being configured for ${client.businessType}
        📅 Calendar integration is being set up
        📞 Phone number assignment (coming soon)
        
        View your dashboard: https://thechattyai-frontend-fax40bwnq-richards-projects-db77a6cf.vercel.app/dashboard
        
        We'll send you another email once your AI agent is ready to start taking calls.
        
        Questions? Just reply to this email - we're here to help!
        
        Best regards,
        The TheChattyAI Team
      `
    }
  }

  private getSetupCompleteTemplate(client: ClientData): EmailTemplate {
    return {
      subject: `🎉 ${client.businessName} AI Agent is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981, #3b82f6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎉 Your AI Agent is Live!</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">
              Ready to start booking appointments
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937;">Great news, ${client.ownerName}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Your AI voice agent for ${client.businessName} is now configured and ready to help your customers book appointments.
            </p>
            
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-top: 0;">✅ Setup Complete</h3>
              <ul style="color: #047857; margin: 0;">
                <li>Calendar integration: Connected</li>
                <li>Business information: Configured</li>
                <li>AI responses: Personalized for ${client.businessType}</li>
                <li>Dashboard: Ready to use</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://thechattyai-frontend-fax40bwnq-richards-projects-db77a6cf.vercel.app/dashboard" 
                 style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">
                View Dashboard
              </a>
              <a href="mailto:support@thechattyai.com?subject=Phone Setup for ${client.businessName}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Get Phone Number
              </a>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0;">📞 Next Step: Phone Integration</h3>
              <p style="color: #b45309; margin: 0;">
                To start receiving calls, click "Get Phone Number" above or reply to this email. We'll help you set up a dedicated phone number for your AI agent.
              </p>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Need help? We're here to support you every step of the way!
            </p>
            
            <p style="color: #4b5563;">
              Best regards,<br>
              The TheChattyAI Team
            </p>
          </div>
        </div>
      `,
      text: `
        🎉 Your AI Agent is Live!
        
        Great news, ${client.ownerName}!
        
        Your AI voice agent for ${client.businessName} is now configured and ready to help your customers book appointments.
        
        ✅ Setup Complete:
        - Calendar integration: Connected
        - Business information: Configured  
        - AI responses: Personalized for ${client.businessType}
        - Dashboard: Ready to use
        
        View Dashboard: https://thechattyai-frontend-fax40bwnq-richards-projects-db77a6cf.vercel.app/dashboard
        
        📞 Next Step: Phone Integration
        To start receiving calls, reply to this email and we'll help you set up a dedicated phone number for your AI agent.
        
        Need help? We're here to support you every step of the way!
        
        Best regards,
        The TheChattyAI Team
      `
    }
  }

  private getNextStepsTemplate(client: ClientData): EmailTemplate {
    return {
      subject: `📞 Ready to connect your phone? (${client.businessName})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #ec4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">📞 Let's Get You Live!</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">
              Your AI agent is ready for phone calls
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937;">Hi ${client.ownerName},</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Your AI agent for ${client.businessName} has been running for 24 hours now. Ready to start taking real customer calls?
            </p>
            
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">🚀 What you get with phone integration:</h3>
              <ul style="color: #1e3a8a; margin: 0;">
                <li>Dedicated business phone number</li>
                <li>24/7 AI-powered call answering</li>
                <li>Automatic appointment booking</li>
                <li>Call recordings and transcripts</li>
                <li>Real-time notifications</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:support@thechattyai.com?subject=Phone Setup for ${client.businessName}&body=Hi! I'm ready to set up phone integration for ${client.businessName}. Please help me get started." 
                 style="background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Set Up Phone Integration
              </a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Setup takes just 15 minutes, and we'll handle everything for you. Your customers will be able to call and book appointments immediately.
            </p>
            
            <p style="color: #4b5563;">
              Questions? Just reply to this email!
            </p>
            
            <p style="color: #4b5563;">
              Best regards,<br>
              The TheChattyAI Team
            </p>
          </div>
        </div>
      `,
      text: `
        📞 Let's Get You Live!
        
        Hi ${client.ownerName},
        
        Your AI agent for ${client.businessName} has been running for 24 hours now. Ready to start taking real customer calls?
        
        🚀 What you get with phone integration:
        - Dedicated business phone number
        - 24/7 AI-powered call answering  
        - Automatic appointment booking
        - Call recordings and transcripts
        - Real-time notifications
        
        Setup takes just 15 minutes, and we'll handle everything for you.
        
        Reply to this email to get started!
        
        Best regards,
        The TheChattyAI Team
      `
    }
  }

  private getPhoneSetupTemplate(client: ClientData): EmailTemplate {
    return {
      subject: `⏰ Don't miss out on calls! (${client.businessName})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">⏰ Missing Customer Calls?</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 10px 0 0 0;">
              Your AI agent is ready to help
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937;">Hi ${client.ownerName},</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Your AI agent for ${client.businessName} is fully set up and ready to start booking appointments. But without phone integration, you might be missing valuable customer calls.
            </p>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
              <h3 style="color: #b91c1c; margin-top: 0;">📊 Did you know?</h3>
              <ul style="color: #dc2626; margin: 0;">
                <li>67% of customers prefer calling to book appointments</li>
                <li>Businesses miss 27% of calls on average</li>
                <li>Each missed call = potential lost revenue</li>
              </ul>
            </div>
            
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
              <h3 style="color: #065f46; margin-top: 0;">✅ Your AI agent can:</h3>
              <ul style="color: #047857; margin: 0;">
                <li>Answer every call, 24/7</li>
                <li>Book appointments instantly</li>
                <li>Handle multiple calls simultaneously</li>
                <li>Never miss a potential customer</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:support@thechattyai.com?subject=URGENT: Phone Setup for ${client.businessName}&body=Hi! I don't want to miss any more calls. Please help me set up phone integration for ${client.businessName} ASAP." 
                 style="background: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Set Up Phone Now
              </a>
            </div>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Don't let another customer call go unanswered. Reply to this email and we'll have your phone integration ready within 24 hours.
            </p>
            
            <p style="color: #4b5563;">
              Best regards,<br>
              The TheChattyAI Team
            </p>
          </div>
        </div>
      `,
      text: `
        ⏰ Missing Customer Calls?
        
        Hi ${client.ownerName},
        
        Your AI agent for ${client.businessName} is fully set up and ready to start booking appointments. But without phone integration, you might be missing valuable customer calls.
        
        📊 Did you know?
        - 67% of customers prefer calling to book appointments
        - Businesses miss 27% of calls on average  
        - Each missed call = potential lost revenue
        
        ✅ Your AI agent can:
        - Answer every call, 24/7
        - Book appointments instantly
        - Handle multiple calls simultaneously
        - Never miss a potential customer
        
        Don't let another customer call go unanswered. Reply to this email and we'll have your phone integration ready within 24 hours.
        
        Best regards,
        The TheChattyAI Team
      `
    }
  }
}

// Email automation triggers
export const emailAutomation = new EmailAutomation()

// Trigger functions for different events
export const triggerEmails = {
  // Immediate welcome email
  onSignup: async (clientData: ClientData) => {
    await emailAutomation.sendWelcomeEmail(clientData)
  },
  
  // Setup completion email
  onSetupComplete: async (clientData: ClientData) => {
    await emailAutomation.sendSetupCompleteEmail(clientData)
  },
  
  // Schedule follow-up emails
  scheduleFollowUps: async (clientData: ClientData) => {
    // 24 hours later
    setTimeout(async () => {
      await emailAutomation.sendNextStepsEmail(clientData)
    }, 24 * 60 * 60 * 1000)
    
    // 48 hours later
    setTimeout(async () => {
      await emailAutomation.sendPhoneSetupReminder(clientData)
    }, 48 * 60 * 60 * 1000)
  }
} 