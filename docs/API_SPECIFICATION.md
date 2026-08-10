# API Specification

> Revised to match the updated PRD. Auth, organization, and invitation endpoints are deferred.

---

## Base URL

```
http://localhost:3000/api/v1
```

All endpoints are prefixed with `/api/v1`.

---

## Public Endpoints

These endpoints are called by the widget and do not require authentication. They validate the chatbot's public key and allowed domains.

### Get Chatbot Configuration

```http
GET /api/v1/public/chatbots/{publicKey}/config
```

Returns the chatbot's public configuration for the widget to initialize.

**Response:**

```json
{
  "publicKey": "bot_pub_abc123",
  "name": "Example Support",
  "welcomeMessage": "Hi! How can I help you today?",
  "fallbackMessage": "I could not find that information...",
  "branding": {
    "primaryColor": "#2563EB",
    "position": "bottom-right"
  }
}
```

### Create Session

```http
POST /api/v1/public/chatbots/{publicKey}/sessions
```

Creates a short-lived signed session token for the conversation.

**Response:**

```json
{
  "sessionToken": "eyJ...",
  "expiresAt": "2026-07-16T10:00:00Z"
}
```

### Send Message

```http
POST /api/v1/public/chatbots/{publicKey}/messages
```

Sends a visitor's question and receives an AI-generated response.

**Headers:**

- `X-Session-Token`: Session token from session creation
- `Origin`: Must match allowed domains

**Request:**

```json
{
  "message": "What are your business hours?",
  "recentMessages": [
    { "role": "assistant", "content": "Hi! How can I help?" },
    { "role": "user", "content": "What are your business hours?" }
  ]
}
```

**Response:**

```json
{
  "response": "Our business hours are Monday to Friday, 9am to 5pm.",
  "sources": [{ "url": "https://example.com/contact", "title": "Contact Us" }],
  "contacts": [
    { "type": "email", "value": "info@example.com" },
    { "type": "phone", "value": "+1-555-0100" }
  ],
  "confidence": "high"
}
```

---

## Internal Endpoints

Used by the dashboard for chatbot management. Protected by internal authentication (implementation phase dependent).

### Chatbot Management

```http
POST   /api/v1/internal/chatbots
GET    /api/v1/internal/chatbots
GET    /api/v1/internal/chatbots/{id}
PATCH  /api/v1/internal/chatbots/{id}
```

### Crawl Management

```http
POST   /api/v1/internal/chatbots/{id}/crawl
GET    /api/v1/internal/chatbots/{id}/crawl-status
GET    /api/v1/internal/chatbots/{id}/pages
POST   /api/v1/internal/chatbots/{id}/reindex
```

### Unanswered Questions

```http
GET    /api/v1/internal/chatbots/{id}/unanswered-questions
PATCH  /api/v1/internal/unanswered-questions/{id}
```

### FAQ Management

```http
POST   /api/v1/internal/chatbots/{id}/faqs
GET    /api/v1/internal/chatbots/{id}/faqs
PATCH  /api/v1/internal/faqs/{id}
DELETE /api/v1/internal/faqs/{id}
```

---

## Health Endpoints

No authentication required.

### Liveness

```http
GET /api/v1/health
```

**Response:**

```json
{ "status": "ok" }
```

### Readiness

```http
GET /api/v1/health/ready
```

**Response (Redis disabled):**

```json
{
  "status": "ready",
  "dependencies": {
    "database": "ok",
    "redis": "disabled"
  }
}
```

**Response (Redis enabled and healthy):**

```json
{
  "status": "ready",
  "dependencies": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "details": [{ "field": "websiteOrigin", "message": "must be a valid URL" }]
}
```

**Standard error codes:** `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`, `PROVIDER_ERROR`, `SERVICE_UNAVAILABLE`

---

## Deferred Endpoints

| Endpoint Group            | Reason                         |
| ------------------------- | ------------------------------ |
| `/api/v1/auth/*`          | Authentication system deferred |
| `/api/v1/organizations/*` | Multi-tenancy deferred         |
| `/api/v1/invitations/*`   | User management deferred       |
| `/api/v1/users/*`         | User management deferred       |
| `/api/v1/analytics/*`     | Advanced analytics deferred    |

---

## Request Headers

| Header             | Required   | Description                                |
| ------------------ | ---------- | ------------------------------------------ |
| `Content-Type`     | Yes        | `application/json`                         |
| `X-Session-Token`  | For chat   | Signed session token                       |
| `X-Correlation-ID` | No         | Request tracing (auto-generated if absent) |
| `Origin`           | For public | Validated against allowed domains          |
