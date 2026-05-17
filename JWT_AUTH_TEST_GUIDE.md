# JWT Authentication System - Testing Guide

## Prerequisites

1. **Ensure `.env` has JWT_SECRET set:**
```bash
JWT_SECRET=your-secret-key-change-in-production
```

2. **Ensure MongoDB is running** (for user/session storage)

3. **Ensure Redis is running** (for optional session management)
```bash
docker run -d -p 6379:6379 redis
```

4. **Start the backend server:**
```bash
npm install
npm start
```

---

## Test Scenarios

### 1. Register New User

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123",
    "confirmPassword": "TestPassword123"
  }'
```

**Expected Response (201):**
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "6123...",
    "email": "testuser@example.com",
    "name": "testuser",
    "emailVerified": false
  },
  "verificationEmailSent": false
}
```

**Store the `accessToken` for next requests.**

---

### 2. Login User

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123"
  }'
```

**Expected Response (200):**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "abc123def456...",
  "sessionToken": "xyz789...",
  "user": {
    "id": "6123...",
    "email": "testuser@example.com",
    "name": "testuser",
    "emailVerified": false
  }
}
```

**Store `accessToken` and `refreshToken` for next tests.**

---

### 3. Access Protected Route (with valid token)

**Request:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your_accessToken_here>"
```

**Expected Response (200):**
```json
{
  "id": "6123...",
  "email": "testuser@example.com",
  "name": "testuser",
  "emailVerified": false
}
```

---

### 4. Access Protected Route (without token)

**Request:**
```bash
curl -X GET http://localhost:3000/api/auth/me
```

**Expected Response (401):**
```json
{
  "error": "Unauthorized"
}
```

---

### 5. Access Protected Route (with expired/invalid token)

**Request:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected Response (401):**
```json
{
  "error": "Invalid or expired token"
}
```

---

### 6. Refresh Token Flow

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<your_refreshToken_here>"
  }'
```

**Expected Response (200):**
```json
{
  "refreshToken": "new_refresh_token...",
  "sessionToken": "new_session_token...",
  "accessToken": "new_access_token..."
}
```

**Use the new `accessToken` for subsequent requests.**

---

### 7. Logout (Revoke Tokens)

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "<your_sessionToken_here>",
    "refreshToken": "<your_refreshToken_here>"
  }'
```

**Expected Response (200):**
```json
{
  "message": "Logged out"
}
```

**After logout, the old tokens should be invalid.**

---

### 8. Test Token Invalidation After Logout

**Request (with old token after logout):**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <old_accessToken>"
```

**Expected Response (401):**
```json
{
  "error": "Token has been revoked"
}
```

---

### 9. Test with Postman (Optional)

**Import this Postman collection:**

```json
{
  "info": {
    "name": "JWT Auth Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@example.com\",\"password\":\"Test123!\",\"confirmPassword\":\"Test123!\"}"
        },
        "url": {"raw": "{{baseUrl}}/api/auth/register", "host": ["{{baseUrl}}"], "path": ["api","auth","register"]}
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"test@example.com\",\"password\":\"Test123!\"}"
        },
        "url": {"raw": "{{baseUrl}}/api/auth/login", "host": ["{{baseUrl}}"], "path": ["api","auth","login"]}
      }
    },
    {
      "name": "Get Me",
      "request": {
        "method": "GET",
        "header": [{"key": "Authorization", "value": "Bearer {{accessToken}}"}],
        "url": {"raw": "{{baseUrl}}/api/auth/me", "host": ["{{baseUrl}}"], "path": ["api","auth","me"]}
      }
    },
    {
      "name": "Refresh Token",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"refreshToken\":\"{{refreshToken}}\"}"
        },
        "url": {"raw": "{{baseUrl}}/api/auth/refresh-token", "host": ["{{baseUrl}}"], "path": ["api","auth","refresh-token"]}
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"sessionToken\":\"{{sessionToken}}\",\"refreshToken\":\"{{refreshToken}}\"}"
        },
        "url": {"raw": "{{baseUrl}}/api/auth/logout", "host": ["{{baseUrl}}"], "path": ["api","auth","logout"]}
      }
    }
  ],
  "variable": [
    {"key": "baseUrl", "value": "http://localhost:3000"},
    {"key": "accessToken", "value": ""},
    {"key": "refreshToken", "value": ""},
    {"key": "sessionToken", "value": ""}
  ]
}
```

---

## Test Checklist

- [ ] Register a new user (201 response, get accessToken)
- [ ] Login existing user (200 response, get accessToken, refreshToken, sessionToken)
- [ ] Access protected route with valid token (200 response)
- [ ] Access protected route without token (401 response)
- [ ] Access protected route with invalid token (401 response)
- [ ] Refresh token returns new accessToken (200 response)
- [ ] Logout revokes tokens (200 response)
- [ ] Using old token after logout fails (401 response)
- [ ] Token expires after 15 minutes (401 response)
- [ ] Refresh token rotates on use (new refreshToken returned)

---

## Debugging

### Check if token is valid
```bash
# Decode JWT (online tool: jwt.io)
# Copy accessToken from response and paste at jwt.io
# Verify payload contains: sub, role, version
```

### Check token version mismatch
```bash
# If getting "Token has been revoked" after logout:
# This means req.user.token_version != payload.version
# Verify User doc was updated with incremented token_version
```

### Check MongoDB for stored tokens
```bash
# Connect to MongoDB shell:
# db.auth_refresh_tokens.find({revokedAt: null})
# Should show active refresh tokens
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `JWT_SECRET not defined` | Set `JWT_SECRET` in `.env` file |
| `Invalid or expired token` | Token might be expired (15min). Use refresh-token endpoint |
| `Token has been revoked` | User's `token_version` was incremented (logout/password change). Login again |
| `User not found` | Verify user exists in MongoDB; check user ID format |
| `Refresh token required` | Include `refreshToken` in POST body as JSON |
| `401 Unauthorized` | Missing `Authorization: Bearer <token>` header |

---

## Postman Setup Steps

1. Create new collection "JWT Auth Tests"
2. Add `baseUrl` variable: `http://localhost:3000`
3. Add request variables: `accessToken`, `refreshToken`, `sessionToken`
4. In Login request, add post-response script:
```javascript
const response = pm.response.json();
pm.environment.set("accessToken", response.accessToken);
pm.environment.set("refreshToken", response.refreshToken);
pm.environment.set("sessionToken", response.sessionToken);
```
5. Use `{{accessToken}}` in Authorization headers for protected routes

---

## Next: Test Role-Based Access (Optional)

If you add admin routes with `requireRole("admin")` middleware:

```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <admin_accessToken>"
```

Expected: 200 if user.role === "admin"
Expected: 403 if user.role !== "admin"
