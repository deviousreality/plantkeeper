# Session-Based Authentication Migration - Complete

## Overview

Successfully migrated from insecure localStorage-based authentication to secure server-side session-based authentication with HTTP-only cookies.

## What Changed

### 1. Database Schema

- **New table**: `sessions` with fields:
  - `id` (TEXT PRIMARY KEY) - Secure random session ID
  - `user_id` (INTEGER) - Foreign key to users table
  - `expires_at` (INTEGER) - Unix timestamp for session expiration
  - `created_at` (INTEGER) - Unix timestamp of session creation
- **Index**: Added index on `expires_at` for efficient cleanup
- **Migration script**: `server/scripts/add_sessions_table.ts`
- **Build script updated**: `server/utils/db_build.ts` now includes sessions table

### 2. Server-Side Components

#### Session Management (`server/utils/session.ts`)

- `createSession(userId)` - Creates new session with 7-day expiration
- `getSession(sessionId)` - Validates and retrieves session
- `deleteSession(sessionId)` - Removes session (logout)
- `getCurrentUser(event)` - Gets authenticated user from session
- `requireAuth(event)` - Middleware helper that throws 401 if not authenticated
- `cleanupExpiredSessions()` - Removes expired sessions from database

#### Session Cleanup Middleware (`server/middleware/session-cleanup.ts`)

- Automatically cleans up expired sessions every hour
- Runs asynchronously without blocking requests

#### Authentication Endpoints

- **Updated `server/api/auth/login.post.ts`**: Now creates session and sets HTTP-only cookie
- **Updated `server/api/auth/register.post.ts`**: Creates session on registration
- **New `server/api/auth/logout.post.ts`**: Deletes session and clears cookie
- **New `server/api/auth/session.get.ts`**: Verifies current session

### 3. Client-Side Components

#### Auth Composable (`composables/useAuth.ts`)

- **Removed**: All localStorage usage
- **Updated `initAuth()`**: Now async, fetches session from server
- **Updated `login()`**: Relies on server-set HTTP-only cookies
- **Updated `register()`**: Relies on server-set HTTP-only cookies
- **Updated `logout()`**: Calls server endpoint to clear session
- **Added**: `credentials: 'include'` to all $fetch calls for cookie support

#### Auth Middleware (`middleware/auth.ts`)

- **Removed**: localStorage checks
- **Updated**: Now async, calls `initAuth()` to verify server session
- **Simplified**: Single authentication flow using server validation

#### App Initialization (`app.vue`)

- **Added**: Script to call `initAuth()` on mount
- Ensures authentication state is loaded from server session on app start

### 4. API Endpoints Updated

All protected endpoints now use `requireAuth(event)` to get authenticated user:

- `server/api/plants/index.get.ts` - List user's plants
- `server/api/plants/index.post.ts` - Create plant (user_id from session)
- `server/api/plants/[id].get.ts` - Get single plant
- `server/api/plants/[id].put.ts` - Update plant (user_id from session)
- `server/api/plants/[id].delete.ts` - Delete plant (with ownership verification)
- `server/api/propagation/index.get.ts` - List propagations
- `server/api/propagation/index.post.ts` - Create propagation
- `server/api/care-schedules/[id].get.ts` - Get care schedule (with ownership verification)

### 5. Package.json

- **Added script**: `db-migrate:sessions` for adding sessions table to existing databases

## Security Improvements

### Before (localStorage-based)

- ❌ User data stored in plain text in browser
- ❌ No server-side validation
- ❌ Client-side authentication easily bypassed
- ❌ User ID sent in query parameters or hardcoded
- ❌ No session expiration
- ❌ XSS vulnerabilities could steal user data

### After (Session-based)

- ✅ HTTP-only cookies prevent XSS attacks
- ✅ Server-side session validation on every request
- ✅ Secure random session IDs (64 hex characters)
- ✅ Session expiration (7 days)
- ✅ Automatic cleanup of expired sessions
- ✅ Ownership verification on sensitive operations
- ✅ User ID always from authenticated session, never from client
- ✅ Secure flag enabled in production (HTTPS only)
- ✅ SameSite=lax prevents CSRF attacks

## Session Configuration

- **Duration**: 7 days (configurable in `server/utils/session.ts`)
- **Cookie Name**: `plantkeeper_session`
- **Cookie Flags**:
  - `httpOnly: true` - Prevents JavaScript access
  - `secure: true` (production only) - HTTPS only
  - `sameSite: 'lax'` - CSRF protection
  - `path: '/'` - Available across entire app
- **Cleanup Interval**: 1 hour

## Migration Steps for Existing Databases

If you have an existing database, run:

```bash
npm run db-migrate:sessions
```

For new databases, the sessions table is automatically created by the build script.

## Testing Recommendations

1. **Test authentication flow**:

   - Login → verify session created
   - Logout → verify session deleted
   - Session persistence across page refreshes

2. **Test session expiration**:

   - Manually set a session to expire
   - Verify automatic cleanup removes it

3. **Test API protection**:

   - Try accessing protected endpoints without authentication
   - Verify 401 responses
   - Test ownership verification on delete operations

4. **Test security**:
   - Verify cookies have httpOnly flag
   - Verify secure flag in production
   - Verify sessions are scoped to correct user

## Breaking Changes

### For Existing Users

- ⚠️ All existing localStorage sessions will be invalid
- Users will need to log in again after update
- No data loss, just need to re-authenticate

### For API Clients

- Must support cookies and send `credentials: 'include'`
- User ID is no longer accepted in request body (comes from session)
- Query parameter `userId` no longer used in GET requests

## Future Enhancements

Potential improvements to consider:

- Redis for session storage (better performance at scale)
- Refresh token rotation
- "Remember me" functionality with longer sessions
- Session activity tracking
- Multi-device session management
- Rate limiting on authentication endpoints
- Two-factor authentication (2FA)
