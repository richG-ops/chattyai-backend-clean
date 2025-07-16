const axios = require('axios');

class GoogleCalendarPlugin {
  constructor() {
    this.baseUrl = process.env.CALENDAR_API_URL || 'https://your-render-app.onrender.com';
  }

  async getAvailability() {
    try {
      const response = await axios.get(`${this.baseUrl}/get-availability`);
      return response.data;
    } catch (error) {
      console.error('Error getting availability:', error.message);
      throw new Error('Unable to check calendar availability');
    }
  }

  async bookAppointment(start, end, summary) {
    try {
      const response = await axios.post(`${this.baseUrl}/book-appointment`, {
        start,
        end,
        summary
      });
      return response.data;
    } catch (error) {
      console.error('Error booking appointment:', error.message);
      throw new Error('Unable to book appointment');
    }
  }

  // Vapi plugin methods
  async getAvailableSlots() {
    const availability = await this.getAvailability();
    return availability.slots.map(slot => ({
      start: new Date(slot.start).toLocaleString(),
      end: new Date(slot.end).toLocaleString(),
      duration: '30 minutes'
    }));
  }

  async scheduleMeeting(startTime, endTime, title) {
    const result = await this.bookAppointment(startTime, endTime, title);
    return {
      success: result.success,
      message: 'Appointment scheduled successfully',
      startTime,
      endTime,
      title
    };
  }
}

// Vapi plugin configuration
const plugin = {
  name: 'google-calendar',
  description: 'Google Calendar integration for scheduling and availability',
  functions: [
    {
      name: 'getAvailableSlots',
      description: 'Get available time slots for the next 7 days',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'scheduleMeeting',
      description: 'Schedule a meeting or appointment',
      parameters: {
        type: 'object',
        properties: {
          startTime: {
            type: 'string',
            description: 'Start time in ISO format (e.g., 2024-01-15T10:00:00Z)'
          },
          endTime: {
            type: 'string',
            description: 'End time in ISO format (e.g., 2024-01-15T10:30:00Z)'
          },
          title: {
            type: 'string',
            description: 'Title or summary of the meeting'
          }
        },
        required: ['startTime', 'endTime', 'title']
      }
    }
  ]
};

module.exports = { GoogleCalendarPlugin, plugin }; 