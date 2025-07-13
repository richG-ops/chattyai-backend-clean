const { getDb } = require('../db-config');
const { v4: uuidv4 } = require('uuid');
const { DateTime } = require('luxon');
const googleCalendarApi = require('../google-calendar-api');
const { addNotificationJob, addAnalyticsJob, logAuditEvent } = require('../lib/job-queue'); // Add this import
const outboundQueue = require('./outbound-processor'); // Add this import
const { io } = require('../index'); // Import io for real-time events

// Process booking jobs
const processBooking = async (job) => {
  const { data } = job;
  const db = getDb();
  
  console.log(`Processing booking job ${job.id}:`, data);
  
  const transaction = await db.transaction();
  
  try {
    // 1. Find or create customer
    let customer = await transaction('customers')
      .where('phone', data.customerPhone)
      .orWhere('email', data.customerEmail)
      .first();
    
    if (!customer) {
      // Create new customer
      const [newCustomer] = await transaction('customers').insert({
        customer_id: uuidv4(),
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail,
        source: data.source || 'vapi',
        metadata: {
          firstCallId: data.callId,
          aiEmployee: data.aiEmployee
        },
        last_contact_at: new Date()
      }).returning('*');
      
      customer = newCustomer;
      
      // Queue analytics event
      await addAnalyticsJob('new_customer', {
        customerId: customer.id,
        source: data.source
      });
    } else {
      // Update existing customer
      await transaction('customers')
        .where('id', customer.id)
        .update({
          last_contact_at: new Date(),
          total_bookings: db.raw('total_bookings + 1')
        });
    }
    
    // 2. Parse appointment date/time
    const timezone = data.timezone || 'America/Los_Angeles';
    const appointmentDate = DateTime.fromISO(data.appointmentDateTime || 
      `${data.date}T${data.time}`, { zone: timezone });
    
    if (!appointmentDate.isValid) {
      throw new Error(`Invalid appointment date/time: ${data.date} ${data.time}`);
    }
    
    // 3. Create booking record
    const [booking] = await transaction('bookings').insert({
      booking_id: uuidv4(),
      customer_id: customer.id,
      tenant_id: data.tenantId,
      service_type: data.serviceType,
      appointment_date: appointmentDate.toJSDate(),
      duration_minutes: data.duration || 60,
      status: 'pending',
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      customer_email: data.customerEmail,
      source: data.source || 'vapi',
      ai_employee: data.aiEmployee,
      call_id: data.callId,
      price: data.price,
      metadata: data.metadata || {}
    }).returning('*');
    
    // 4. Create calendar event
    let calendarEventId = null;
    try {
      const calendarResult = await googleCalendarApi.createEvent({
        summary: `${data.serviceType} - ${data.customerName}`,
        description: `Customer: ${data.customerName}
Phone: ${data.customerPhone}
Email: ${data.customerEmail || 'Not provided'}
Service: ${data.serviceType}
Booked via: ${data.aiEmployee || 'AI Assistant'}`,
        start: appointmentDate.toISO(),
        end: appointmentDate.plus({ minutes: data.duration || 60 }).toISO(),
        attendees: data.customerEmail ? [{ email: data.customerEmail }] : []
      });
      
      calendarEventId = calendarResult.id;
      
      // Update booking with calendar ID
      await transaction('bookings')
        .where('id', booking.id)
        .update({
          calendar_event_id: calendarEventId,
          status: 'confirmed',
          confirmed_at: new Date()
        });
    } catch (calendarError) {
      console.error('Calendar creation failed:', calendarError);
      // Continue - we'll retry calendar sync later
    }
    
    // 5. Update call record if exists
    if (data.callId) {
      await transaction('calls')
        .where('call_id', data.callId)
        .update({
          outcome: 'booked',
          appointment_booked: true,
          booking_id: booking.booking_id
        });
    }
    
    // Commit transaction
    await transaction.commit();
    
    // 6. Queue notification jobs (outside transaction)
    const notifications = [];
    
    // Customer SMS
    if (data.customerPhone) {
      notifications.push(addNotificationJob('sms', {
        to: data.customerPhone,
        template: 'booking_confirmation',
        data: {
          customerName: data.customerName,
          serviceType: data.serviceType,
          appointmentDate: appointmentDate.toFormat('EEEE, MMMM d'),
          appointmentTime: appointmentDate.toFormat('h:mm a'),
          bookingId: booking.booking_id
        }
      }));
    }
    
    // Customer Email
    if (data.customerEmail) {
      notifications.push(addNotificationJob('email', {
        to: data.customerEmail,
        template: 'booking_confirmation',
        data: {
          customerName: data.customerName,
          serviceType: data.serviceType,
          appointmentDate: appointmentDate.toFormat('EEEE, MMMM d'),
          appointmentTime: appointmentDate.toFormat('h:mm a'),
          bookingId: booking.booking_id,
          calendarLink: calendarEventId ? 
            `https://calendar.google.com/calendar/r/eventedit/${calendarEventId}` : null
        }
      }));
    }
    
    // Owner notifications
    if (data.ownerPhone) {
      notifications.push(addNotificationJob('sms', {
        to: data.ownerPhone,
        template: 'owner_new_booking',
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          serviceType: data.serviceType,
          appointmentDate: appointmentDate.toFormat('EEEE, MMMM d'),
          appointmentTime: appointmentDate.toFormat('h:mm a')
        },
        priority: 5 // Higher priority for owner
      }));
    }
    
    await Promise.all(notifications);
    
    // 7. Schedule reminder (24 hours before)
    const reminderTime = appointmentDate.minus({ hours: 24 }).toMillis() - Date.now();
    if (reminderTime > 0) {
      await addFollowupJob({
        type: 'appointment_reminder',
        bookingId: booking.id,
        customerId: customer.id
      }, reminderTime);
    }
    
    // 8. Analytics
    await addAnalyticsJob('booking_created', {
      bookingId: booking.id,
      customerId: customer.id,
      serviceType: data.serviceType,
      source: data.source,
      aiEmployee: data.aiEmployee
    });

    // Audit log for booking creation
    await logAuditEvent('booking_created', customer.id, {
      bookingId: booking.booking_id,
      serviceType: data.serviceType,
      source: data.source
    });

    // Emit real-time event to dashboard (multi-tenant room)
    if (io && data.tenantId) {
      io.to(data.tenantId).emit('new-booking', {
        bookingId: booking.booking_id,
        customerName: data.customerName,
        appointmentDate: appointmentDate.toISO(),
        serviceType: data.serviceType
      });
    }

    // 9. Outbound follow-up if booking not confirmed (customize logic as needed)
    if (!booking || booking.status !== 'confirmed') {
      if (data.customerPhone) {
        await outboundQueue.add({
          phone: data.customerPhone,
          script: `Hi ${data.customerName}, following up from your call—let's schedule that appointment!`,
          tenantId: data.tenantId
        }, { delay: 60000 }); // 1min polite delay
        // Audit log for outbound follow-up
        await logAuditEvent('outbound_followup_queued', customer.id, {
          phone: data.customerPhone,
          tenantId: data.tenantId
        });
      }
    }
    
    console.log(`✅ Booking ${booking.booking_id} processed successfully`);
    
    return {
      success: true,
      bookingId: booking.booking_id,
      customerId: customer.id,
      calendarEventId
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Booking job ${job.id} failed:`, error);
    throw error; // Will trigger retry
  }
};

module.exports = { processBooking }; 