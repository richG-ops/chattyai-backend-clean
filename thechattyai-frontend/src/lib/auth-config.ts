/**
 * NextAuth Configuration for TheChattyAI
 * Production-ready authentication with multiple providers
 */

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import jwt from 'jsonwebtoken'

// Custom types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      role: 'admin' | 'client' | 'user'
      clientId?: string
      apiKey?: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string
    role: 'admin' | 'client' | 'user'
    clientId?: string
    apiKey?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'admin' | 'client' | 'user'
    clientId?: string
    apiKey?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth for admin login
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),

    // Email magic links for clients
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      },
      from: process.env.EMAIL_FROM,
      maxAge: 24 * 60 * 60, // 24 hours
    }),

    // Credentials for API key authentication
    CredentialsProvider({
      name: 'API Key',
      credentials: {
        apiKey: { label: "API Key", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.apiKey) {
          throw new Error('API key is required')
        }

        try {
          // Verify the API key with your backend
          const response = await fetch(`${process.env.CALENDAR_API_URL}/api/verify-key`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${credentials.apiKey}`
            }
          })

          if (!response.ok) {
            throw new Error('Invalid API key')
          }

          const client = await response.json()

          return {
            id: client.id,
            email: client.email,
            name: client.businessName,
            role: 'client',
            clientId: client.id,
            apiKey: credentials.apiKey
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],

  callbacks: {
    // Determine if user is allowed to sign in
    async signIn({ user, account, profile, email, credentials }) {
      // Admin check for Google OAuth
      if (account?.provider === 'google') {
        const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
        if (!user.email || !adminEmails.includes(user.email)) {
          return false // Not an admin
        }
        // Set admin role
        user.role = 'admin'
      }

      // Always allow email and credentials providers
      return true
    },

    // JWT callback - runs whenever JWT is created, updated or accessed
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.clientId = user.clientId
        token.apiKey = user.apiKey
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        token = { ...token, ...session }
      }

      return token
    },

    // Session callback - what data is exposed to the client
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.clientId = token.clientId
        session.user.apiKey = token.apiKey
      }

      return session
    },

    // Redirect after sign in
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after successful login
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`
      }
      
      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url
      }
      
      return baseUrl
    }
  },

  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login', // Error code passed in query string as ?error=
    verifyRequest: '/login?verify=1', // Used for check email message
    newUser: '/onboarding' // Redirect new users here
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Security settings
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },

  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',

  // Events for logging/monitoring
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User signed in: ${user.email} (${account?.provider})`)
      // You could send this to your analytics/monitoring service
    },
    async signOut({ session, token }) {
      console.log(`User signed out: ${session?.user?.email}`)
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`)
      // Send welcome email, create initial data, etc.
    },
    async linkAccount({ user, account, profile }) {
      console.log(`Account linked: ${user.email} with ${account.provider}`)
    },
    async session({ session, token }) {
      // Called whenever a session is checked
    }
  }
}

// Helper functions for auth

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(session: any): Promise<boolean> {
  return !!session?.user?.email
}

/**
 * Check if user has a specific role
 */
export function hasRole(session: any, role: string): boolean {
  return session?.user?.role === role
}

/**
 * Check if user is admin
 */
export function isAdmin(session: any): boolean {
  return hasRole(session, 'admin')
}

/**
 * Check if user is a client
 */
export function isClient(session: any): boolean {
  return hasRole(session, 'client')
}

/**
 * Generate a secure API key for new clients
 */
export function generateApiKey(): string {
  const key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `chattyai_${key}`
}

/**
 * Create a JWT token for API access
 */
export function createApiToken(clientId: string, apiKey: string): string {
  return jwt.sign(
    { 
      client_id: clientId,
      api_key: apiKey,
      type: 'api_access'
    },
    process.env.JWT_SECRET!,
    { 
      expiresIn: '365d',
      issuer: 'thechattyai.com'
    }
  )
} 