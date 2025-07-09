/**
 * Production-ready API client for TheChattyAI
 * Implements retry logic, error handling, and authentication
 */

interface ApiConfig {
  baseUrl: string
  jwtToken?: string
  timeout?: number
  retries?: number
}

interface ApiError extends Error {
  status?: number
  code?: string
  details?: any
}

class ApiClient {
  private config: Required<ApiConfig>
  private abortControllers: Map<string, AbortController> = new Map()

  constructor(config: ApiConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      jwtToken: config.jwtToken || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 3
    }
  }

  /**
   * Create a unique request ID for tracking and cancellation
   */
  private createRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cancel a specific request or all pending requests
   */
  cancelRequest(requestId?: string): void {
    if (requestId) {
      const controller = this.abortControllers.get(requestId)
      if (controller) {
        controller.abort()
        this.abortControllers.delete(requestId)
      }
    } else {
      // Cancel all pending requests
      this.abortControllers.forEach(controller => controller.abort())
      this.abortControllers.clear()
    }
  }

  /**
   * Make an API request with retry logic and error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = this.config.retries
  ): Promise<T> {
    const requestId = this.createRequestId()
    const controller = new AbortController()
    this.abortControllers.set(requestId, controller)

    const url = `${this.config.baseUrl}${endpoint}`
    const timeout = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.jwtToken && {
            'Authorization': `Bearer ${this.config.jwtToken}`
          }),
          ...options.headers
        }
      })

      clearTimeout(timeout)
      this.abortControllers.delete(requestId)

      if (!response.ok) {
        const error: ApiError = new Error(`API Error: ${response.statusText}`)
        error.status = response.status

        try {
          const errorData = await response.json()
          error.message = errorData.error || errorData.message || error.message
          error.details = errorData
        } catch {
          // Response wasn't JSON
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw error
        }

        // Retry on server errors (5xx) or network issues
        if (retries > 0) {
          await this.delay(1000 * (this.config.retries - retries + 1))
          return this.request<T>(endpoint, options, retries - 1)
        }

        throw error
      }

      const data = await response.json()
      return data as T
    } catch (error: any) {
      clearTimeout(timeout)
      this.abortControllers.delete(requestId)

      if (error.name === 'AbortError') {
        const timeoutError: ApiError = new Error('Request timeout')
        timeoutError.code = 'TIMEOUT'
        throw timeoutError
      }

      // Retry on network errors
      if (retries > 0 && this.isNetworkError(error)) {
        await this.delay(1000 * (this.config.retries - retries + 1))
        return this.request<T>(endpoint, options, retries - 1)
      }

      throw error
    }
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: any): boolean {
    return error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND' ||
           error.code === 'ETIMEDOUT' ||
           error.message === 'Failed to fetch' ||
           error.message === 'Network request failed'
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET'
    })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE'
    })
  }

  /**
   * Update JWT token
   */
  setToken(token: string): void {
    this.config.jwtToken = token
  }
}

// Calendar API specific methods
export class CalendarApiClient extends ApiClient {
  constructor(jwtToken?: string) {
    // Use production backend URL for production, localhost for development
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? 'https://chattyai-calendar-bot-1.onrender.com' 
                     : 'http://localhost:4000')
    
    const token = jwtToken || 
                 process.env.NEXT_PUBLIC_JWT_TOKEN || 
                 process.env.CALENDAR_API_JWT_TOKEN ||
                 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiMDFiYTE2OGRkMzBjMDM3N2MxZjBjNzRiOTM2ZjQyNzQiLCJjbGllbnRfaWQiOiJkZW1vLWNsaWVudCIsImJ1c2luZXNzX25hbWUiOiJEZW1vIEJ1c2luZXNzIiwiZW1haWwiOiJkZW1vQGJ1c2luZXNzLmNvbSIsImlhdCI6MTc1MjA4NzcwNCwiZXhwIjoxNzgzNjQ1MzA0fQ.xYj4zB62N0vuKwyv_nfdMsewPTR3OFXKke2kcmOxywI'
    
    super({
      baseUrl,
      jwtToken: token
    })
    
    console.log('📡 CalendarApiClient initialized:', {
      baseUrl,
      environment: process.env.NODE_ENV,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
    })
  }

  /**
   * Get available appointment slots
   */
  async getAvailability(options?: {
    date?: string
    duration?: number
    count?: number
  }) {
    const params = new URLSearchParams()
    if (options?.date) params.append('date', options.date)
    if (options?.duration) params.append('duration', options.duration.toString())
    if (options?.count) params.append('count', options.count.toString())

    const endpoint = `/get-availability${params.toString() ? `?${params}` : ''}`
    console.log('📅 Fetching availability from:', endpoint)
    
    return this.get<{
      slots: Array<{
        start: string
        end: string
      }>
    }>(endpoint)
  }

  /**
   * Book an appointment
   */
  async bookAppointment(data: {
    start: string
    end: string
    summary: string
    customerName?: string
    customerPhone?: string
    notes?: string
  }) {
    console.log('📝 Booking appointment:', data)
    return this.post<{ success: boolean }>('/book-appointment', data)
  }

  /**
   * Check health status
   */
  async checkHealth() {
    console.log('🔍 Checking API health')
    return this.get<{
      status: string
      timestamp: string
    }>('/health')
  }

  /**
   * Get client metrics
   */
  async getClientMetrics(clientId: string, period: 'today' | 'week' | 'month' = 'today') {
    console.log(`📊 Fetching metrics for client ${clientId}, period: ${period}`)
    return this.get<{
      success: boolean
      metrics: any
      timestamp: string
    }>(`/api/clients/${clientId}/metrics?period=${period}`)
  }

  /**
   * Get client bookings
   */
  async getClientBookings(clientId: string, limit: number = 10) {
    console.log(`📅 Fetching bookings for client ${clientId}, limit: ${limit}`)
    return this.get<{
      success: boolean
      bookings: any[]
      total: number
    }>(`/api/clients/${clientId}/bookings?limit=${limit}`)
  }

  /**
   * Test connection to backend
   */
  async testConnection() {
    console.log('🔗 Testing backend connection')
    return this.get<{
      status: string
      timestamp: string
      server: string
      version: string
    }>('/api/test/connection')
  }
}

// Client management API
export class ClientApiClient extends ApiClient {
  constructor() {
    super({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
      jwtToken: typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : ''
    })
  }

  /**
   * Create a new client
   */
  async createClient(clientData: {
    businessName: string
    businessType: string
    ownerName: string
    email: string
    phone: string
    address?: string
    description?: string
    services?: string[]
    workingHours?: {
      start: string
      end: string
    }
    timeZone?: string
  }) {
    console.log('🏢 Creating new client:', clientData)
    return this.post<{
      success: boolean
      client: any
      credentials: {
        apiKey: string
        jwtToken: string
      }
      message: string
    }>('/api/clients', clientData)
  }

  /**
   * Get client profile
   */
  async getClientProfile(clientId: string) {
    console.log(`👤 Fetching client profile for ${clientId}`)
    return this.get<{
      success: boolean
      client: any
    }>(`/api/clients/${clientId}`)
  }
}

// Export singleton instances
export const calendarApi = new CalendarApiClient()
export const clientApi = new ClientApiClient()

// Export classes for custom instances
export { ApiClient, ApiError } 