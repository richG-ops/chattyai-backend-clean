# 📡 TheChattyAI Calendar API Reference

## 🔐 Authentication

All API requests require JWT Bearer token authentication:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

```javascript
// Generate JWT with your credentials
const jwt = require('jsonwebtoken');
const token = jwt.sign({
  api_key: 'your-api-key',
  client_id: 'your-client-id',
  business_name: 'Your Business'
}, process.env.JWT_SECRET, { expiresIn: '365d' });
```

---

## 🏥 Health Check

### `GET /health`

Check API status and dependencies.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-09T20:15:00Z",
  "version": "1.0.0",
  "dependencies": {
    "database": "connected",
    "redis": "connected",
    "googleCalendar": "authenticated"
  }
}
```

---

## 📅 Calendar Operations

### `GET /get-availability`

Get available time slots for booking.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | ISO 8601 | No | Start date (default: today) |
| duration | number | No | Slot duration in minutes (15-240, default: 30) |
| count | number | No | Number of slots to return (1-10, default: 3) |

**Example Request:**
```http
GET /get-availability?date=2024-01-15&duration=60&count=5
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "slots": [
    {
      "start": "2024-01-15T09:00:00Z",
      "end": "2024-01-15T10:00:00Z"
    },
    {
      "start": "2024-01-15T11:00:00Z",
      "end": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### `POST /book-appointment`

Book an appointment slot.

**Request Body:**
```json
{
  "start": "2024-01-15T09:00:00Z",
  "end": "2024-01-15T10:00:00Z",
  "summary": "Strategy Session with John Doe"
}
```

**Validation Rules:**
- `start` and `end` are required ISO 8601 timestamps
- Appointment must be in the future
- Duration must be 15-240 minutes
- Summary is optional (max 200 chars)

**Success Response (200):**
```json
{
  "success": true,
  "eventId": "abc123xyz",
  "htmlLink": "https://calendar.google.com/event?id=abc123xyz"
}
```

**Error Response (409 - Conflict):**
```json
{
  "error": "Time slot not available",
  "message": "This time slot has already been booked"
}
```

---

## 📊 Dashboard API

### `GET /api/test/connection`

Test API connectivity and authentication.

**Success Response (200):**
```json
{
  "status": "connected",
  "timestamp": "2024-01-09T20:15:00Z",
  "source": "https://app.thechattyai.com",
  "authenticated": true,
  "client": {
    "id": "demo-client",
    "name": "Demo Business"
  }
}
```

### `GET /api/clients/:id/metrics`

Get client metrics and analytics.

**URL Parameters:**
- `id` - Client ID (use "demo" for testing)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | Time period: today, week, month, year (default: today) |

**Example Request:**
```http
GET /api/clients/demo/metrics?period=week
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "metrics": {
    "totalBookings": 42,
    "completedBookings": 38,
    "cancelledBookings": 4,
    "upcomingBookings": 12,
    "conversionRate": 0.67,
    "averageBookingValue": 150.00,
    "peakHours": ["10:00", "14:00", "16:00"],
    "popularServices": [
      {
        "name": "Consultation",
        "count": 25,
        "percentage": 0.60
      },
      {
        "name": "Follow-up",
        "count": 17,
        "percentage": 0.40
      }
    ]
  },
  "period": {
    "start": "2024-01-08T00:00:00Z",
    "end": "2024-01-14T23:59:59Z"
  }
}
```

---

## 🚨 Error Responses

All errors follow RFC 7807 Problem Details format:

```json
{
  "error": "Short error code",
  "message": "Human-readable description",
  "details": {
    "field": "Additional context"
  },
  "timestamp": "2024-01-09T20:15:00Z"
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Validation error | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., double booking) |
| 429 | Too many requests | Rate limit exceeded |
| 500 | Internal error | Server error (check status page) |

---

## 🚀 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/health` | 100 | 1 minute |
| `/get-availability` | 100 | 1 minute |
| `/book-appointment` | 50 | 1 minute |
| `/api/*` | 200 | 1 minute |
| `/auth/*` | 5 | 15 minutes |

Exceeded limits return `429 Too Many Requests` with:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60,
  "limit": 100,
  "remaining": 0,
  "reset": "2024-01-09T20:16:00Z"
}
```

---

## 🔗 Webhooks (Coming Soon)

Subscribe to real-time events:
- `booking.created`
- `booking.updated`
- `booking.cancelled`
- `client.metrics.updated`

---

## 📝 SDKs

Official SDKs available:
- [JavaScript/TypeScript](https://npm.im/@thechattyai/sdk)
- [Python](https://pypi.org/project/thechattyai)
- [Go](https://pkg.go.dev/github.com/thechattyai/go-sdk)

---

Built with ❤️ by TheChattyAI | [Status Page](https://status.thechattyai.com) | [Support](mailto:api@thechattyai.com) 