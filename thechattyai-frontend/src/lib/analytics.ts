declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-XXXXXXXXXX'

// Track page views
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_location: url,
    })
  }
}

// Track conversion events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Specific conversion tracking
export const trackConversion = {
  // Landing page actions
  getStartedClick: () => trackEvent('click', 'conversion', 'get_started_free'),
  watchDemoClick: () => trackEvent('click', 'engagement', 'watch_demo'),
  
  // Onboarding flow
  onboardingStart: () => trackEvent('begin_checkout', 'onboarding', 'step_1'),
  onboardingStep: (step: number) => trackEvent('checkout_progress', 'onboarding', `step_${step}`),
  onboardingComplete: () => trackEvent('purchase', 'onboarding', 'setup_complete'),
  
  // Dashboard usage
  dashboardView: () => trackEvent('page_view', 'dashboard', 'main'),
  apiCallMade: (endpoint: string) => trackEvent('api_call', 'backend', endpoint),
  
  // Business metrics
  appointmentBooked: (source: string) => trackEvent('appointment_booked', 'business', source),
  phoneCallAnswered: () => trackEvent('phone_call', 'ai_agent', 'answered'),
  
  // User engagement
  timeOnSite: (seconds: number) => trackEvent('timing_complete', 'engagement', 'session_duration', seconds),
  featureUsed: (feature: string) => trackEvent('feature_use', 'product', feature),
}

// Track user journey
export const trackUserJourney = {
  landingPageView: () => {
    pageview(window.location.pathname)
    trackEvent('page_view', 'landing', 'home')
  },
  
  onboardingFlow: (step: number, stepName: string) => {
    trackEvent('onboarding_progress', 'conversion', stepName, step)
  },
  
  setupComplete: (businessType: string) => {
    trackEvent('setup_complete', 'conversion', businessType)
    trackEvent('purchase', 'ecommerce', 'free_trial', 0)
  },
  
  dashboardEngagement: (action: string) => {
    trackEvent('dashboard_action', 'engagement', action)
  }
}

// Enhanced ecommerce tracking
export const trackEcommerce = {
  beginCheckout: (businessType: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'begin_checkout', {
        currency: 'USD',
        value: 0,
        items: [{
          item_id: 'free_trial',
          item_name: 'AI Voice Agent Setup',
          item_category: businessType,
          quantity: 1,
          price: 0
        }]
      })
    }
  },
  
  purchase: (businessType: string, clientId: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: clientId,
        currency: 'USD',
        value: 0,
        items: [{
          item_id: 'free_trial',
          item_name: 'AI Voice Agent Setup',
          item_category: businessType,
          quantity: 1,
          price: 0
        }]
      })
    }
  }
} 