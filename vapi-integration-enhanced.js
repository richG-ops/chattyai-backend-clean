const axios = require('axios');

/**
 * TheChattyAI Calendar Integration for Vapi.ai
 * Production-ready voice agent calendar management
 */
class TheChattyAICalendarIntegration {
  constructor(config = {}) {
    this.baseUrl = config.apiUrl || 'https://chattyai-calendar-bot-1.onrender.com';
    this.jwtToken = config.jwtToken || process.env.CHATTYAI_JWT_TOKEN;
    this.timezone = config.timezone || 'America/Los_Angeles';
    this.defaultDuration = config.defaultDuration || 30; // minutes
    this.businessHours = config.businessHours || {
      start: 9, // 9 AM
      end: 17,  // 5 PM
      workDays: [1, 2, 3, 4, 5] // Monday to Friday
    };
  }

  // Helper to make authenticated requests
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.jwtToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error.message);
      throw new Error(error.response?.data?.error || 'Calendar service unavailable');
    }
  }

  // Format time for voice-friendly output
  formatTimeForVoice(dateString) {
    const date = new Date(dateString);
    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: this.timezone
    };
    
    const formatted = date.toLocaleString('en-US', options);
    // Make it more natural for voice
    return formatted
      .replace(':00', '') // Remove :00 for on-the-hour times
      .replace(' at ', ' at ')
      .replace('AM', 'A.M.')
      .replace('PM', 'P.M.');
  }

  // Parse natural language dates from voice input
  parseNaturalDate(input) {
    const now = new Date();
    const normalizedInput = input.toLowerCase();
    
    // Handle common voice patterns
    const patterns = {
      'today': () => now,
      'tomorrow': () => new Date(now.getTime() + 24 * 60 * 60 * 1000),
      'next monday': () => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = now.getDay();
        const targetDay = 1; // Monday
        const daysUntil = (targetDay - today + 7) % 7 || 7;
        return new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
      },
      // Add more patterns as needed
    };
    
    for (const [pattern, dateFunc] of Object.entries(patterns)) {
      if (normalizedInput.includes(pattern)) {
        return dateFunc();
      }
    }
    
    // Try to parse MM/DD format
    const dateMatch = normalizedInput.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
      const month = parseInt(dateMatch[1]) - 1;
      const day = parseInt(dateMatch[2]);
      const year = now.getFullYear();
      return new Date(year, month, day);
    }
    
    return null;
  }

  // Parse time from voice input
  parseTime(input, baseDate = new Date()) {
    const normalizedInput = input.toLowerCase()
      .replace('a.m.', 'am')
      .replace('p.m.', 'pm')
      .replace(' o\'clock', ':00')
      .replace(' thirty', ':30')
      .replace(' fifteen', ':15')
      .replace(' forty five', ':45');
    
    // Match time patterns like "10:30 am", "2 pm", "3:15"
    const timeMatch = normalizedInput.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!timeMatch) return null;
    
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] || '0');
    const meridiem = timeMatch[3];
    
    // Handle 12-hour format
    if (meridiem) {
      if (meridiem === 'pm' && hours !== 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
    } else if (hours < 8) {
      // Assume PM for times less than 8 without meridiem
      hours += 12;
    }
    
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  // Get available slots with business hours filtering
  async getAvailableSlots(options = {}) {
    const { 
      date = null,
      duration = this.defaultDuration,
      count = 3 
    } = options;
    
    try {
      const response = await this.makeRequest('/get-availability');
      let slots = response.slots || [];
      
      // Filter by business hours
      slots = slots.filter(slot => {
        const startDate = new Date(slot.start);
        const hour = startDate.getHours();
        const dayOfWeek = startDate.getDay();
        
        return hour >= this.businessHours.start && 
               hour < this.businessHours.end &&
               this.businessHours.workDays.includes(dayOfWeek);
      });
      
      // Filter by specific date if provided
      if (date) {
        const targetDate = new Date(date);
        slots = slots.filter(slot => {
          const slotDate = new Date(slot.start);
          return slotDate.toDateString() === targetDate.toDateString();
        });
      }
      
      // Limit results
      slots = slots.slice(0, count);
      
      // Format for voice output
      return slots.map(slot => ({
        start: slot.start,
        end: slot.end,
        displayTime: this.formatTimeForVoice(slot.start),
        duration: `${duration} minutes`
      }));
    } catch (error) {
      console.error('Error getting availability:', error);
      throw error;
    }
  }

  // Book appointment with enhanced validation
  async bookAppointment(options) {
    const {
      date,
      time,
      duration = this.defaultDuration,
      title,
      customerName,
      customerPhone,
      notes
    } = options;
    
    // Parse natural language inputs
    const appointmentDate = typeof date === 'string' ? this.parseNaturalDate(date) : new Date(date);
    if (!appointmentDate) {
      throw new Error('Could not understand the date. Please try again.');
    }
    
    const startTime = typeof time === 'string' ? this.parseTime(time, appointmentDate) : new Date(time);
    if (!startTime) {
      throw new Error('Could not understand the time. Please try again.');
    }
    
    // Calculate end time
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    // Validate business hours
    const hour = startTime.getHours();
    const dayOfWeek = startTime.getDay();
    
    if (hour < this.businessHours.start || hour >= this.businessHours.end) {
      throw new Error(`Appointments are only available between ${this.businessHours.start} AM and ${this.businessHours.end - 12} PM.`);
    }
    
    if (!this.businessHours.workDays.includes(dayOfWeek)) {
      throw new Error('Appointments are only available Monday through Friday.');
    }
    
    // Build appointment details
    const summary = title || `Appointment with ${customerName || 'Customer'}`;
    const description = [
      customerName && `Customer: ${customerName}`,
      customerPhone && `Phone: ${customerPhone}`,
      notes && `Notes: ${notes}`,
      'Booked via TheChattyAI Voice Agent'
    ].filter(Boolean).join('\n');
    
    try {
      const result = await this.makeRequest('/book-appointment', 'POST', {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        summary,
        description
      });
      
      return {
        success: true,
        message: `Perfect! I've booked your appointment for ${this.formatTimeForVoice(startTime)}. The appointment will last ${duration} minutes.`,
        details: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          displayTime: this.formatTimeForVoice(startTime),
          duration: `${duration} minutes`,
          summary
        }
      };
    } catch (error) {
      throw new Error(`I couldn't book that appointment. ${error.message}`);
    }
  }

  // Cancel appointment (future feature)
  async cancelAppointment(appointmentId) {
    // Placeholder for future implementation
    throw new Error('Appointment cancellation is coming soon!');
  }

  // Reschedule appointment (future feature)
  async rescheduleAppointment(appointmentId, newDate, newTime) {
    // Placeholder for future implementation
    throw new Error('Appointment rescheduling is coming soon!');
  }
}

// Vapi.ai Function Definitions
const vapiFunctions = [
  {
    name: 'checkAvailability',
    description: 'Check available appointment slots for a specific date or the next available slots',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to check (e.g., "tomorrow", "next Monday", "12/25"). Leave empty for next available.'
        },
        timePreference: {
          type: 'string',
          description: 'Preferred time of day (e.g., "morning", "afternoon", "evening")'
        },
        count: {
          type: 'number',
          description: 'Number of slots to return (default: 3)'
        }
      },
      required: []
    }
  },
  {
    name: 'bookAppointment',
    description: 'Book an appointment at a specific date and time',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date for the appointment (e.g., "tomorrow", "next Tuesday", "12/25")'
        },
        time: {
          type: 'string',
          description: 'The time for the appointment (e.g., "10:30 am", "2 pm", "15:45")'
        },
        duration: {
          type: 'number',
          description: 'Duration in minutes (default: 30)'
        },
        customerName: {
          type: 'string',
          description: 'Name of the customer'
        },
        customerPhone: {
          type: 'string',
          description: 'Phone number of the customer'
        },
        serviceType: {
          type: 'string',
          description: 'Type of service or appointment'
        },
        notes: {
          type: 'string',
          description: 'Additional notes or special requests'
        }
      },
      required: ['date', 'time', 'customerName']
    }
  },
  {
    name: 'getBusinessHours',
    description: 'Get the business hours and availability information',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Vapi.ai Handler Functions
const vapiHandlers = {
  async checkAvailability(params, context) {
    const integration = new TheChattyAICalendarIntegration(context.config);
    
    try {
      const slots = await integration.getAvailableSlots({
        date: params.date,
        count: params.count || 3
      });
      
      if (slots.length === 0) {
        return {
          response: "I'm sorry, but I don't see any available appointments for that time. Would you like me to check another day?"
        };
      }
      
      const slotDescriptions = slots.map((slot, index) => 
        `Option ${index + 1}: ${slot.displayTime}`
      ).join(', ');
      
      return {
        response: `I found ${slots.length} available appointments. ${slotDescriptions}. Which one works best for you?`,
        data: { slots }
      };
    } catch (error) {
      return {
        response: "I'm having trouble checking the calendar right now. Can you please try again in a moment?"
      };
    }
  },
  
  async bookAppointment(params, context) {
    const integration = new TheChattyAICalendarIntegration(context.config);
    
    try {
      const result = await integration.bookAppointment({
        date: params.date,
        time: params.time,
        duration: params.duration || 30,
        title: params.serviceType || 'Appointment',
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        notes: params.notes
      });
      
      return {
        response: result.message,
        data: result.details
      };
    } catch (error) {
      return {
        response: error.message || "I couldn't book that appointment. Would you like to try a different time?"
      };
    }
  },
  
  async getBusinessHours(params, context) {
    const integration = new TheChattyAICalendarIntegration(context.config);
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const workDayNames = integration.businessHours.workDays.map(day => days[day]);
    
    return {
      response: `We're open ${workDayNames.join(', ')} from ${integration.businessHours.start} AM to ${integration.businessHours.end - 12} PM. When would you like to schedule your appointment?`
    };
  }
};

module.exports = {
  TheChattyAICalendarIntegration,
  vapiFunctions,
  vapiHandlers
}; 