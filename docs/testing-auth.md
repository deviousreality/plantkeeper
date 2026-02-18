# Session-Based Authentication Tests

## Test Coverage

### Session Utility Tests (`server/utils/__tests__/session.test.ts`)

Comprehensive tests for all session management functions:

#### `createSession`

- ✅ Creates a new session for a user
- ✅ Generates unique 64-character session IDs
- ✅ Sets expiration 7 days in the future
- ✅ Stores session in database correctly

#### `getSession`

- ✅ Retrieves valid sessions
- ✅ Returns null for non-existent sessions
- ✅ Returns null for expired sessions

#### `deleteSession`

- ✅ Deletes sessions successfully
- ✅ Handles deletion of non-existent sessions gracefully

#### `deleteUserSessions`

- ✅ Deletes all sessions for a specific user
- ✅ Preserves other users' sessions

#### `cleanupExpiredSessions`

- ✅ Removes expired sessions
- ✅ Keeps valid sessions intact

#### `getCurrentUser`

- ✅ Returns user when valid session cookie exists
- ✅ Returns null when no session cookie
- ✅ Returns null for invalid sessions
- ✅ Returns null for expired sessions

#### `requireAuth`

- ✅ Returns user when authenticated
- ✅ Throws 401 error when not authenticated

#### Cookie Helpers

- ✅ `getSessionIdFromCookie` extracts session ID from cookies
- ✅ `setSessionCookie` sets HTTP-only cookie with correct options
- ✅ `clearSessionCookie` clears session cookie

### Authentication Endpoint Tests (`server/api/auth/__tests__/auth.test.ts`)

#### POST /api/auth/login

- ✅ Logs in successfully with valid credentials
- ✅ Creates session on successful login
- ✅ Sets HTTP-only session cookie
- ✅ Returns 400 if username is missing
- ✅ Returns 400 if password is missing
- ✅ Returns 401 if user does not exist
- ✅ Returns 401 if password is incorrect
- ✅ Does not include password in response

#### POST /api/auth/logout

- ✅ Deletes session when logging out
- ✅ Clears session cookie
- ✅ Handles logout when no session exists

#### GET /api/auth/session

- ✅ Returns user when authenticated
- ✅ Throws 401 when not authenticated

#### POST /api/auth/register

- ✅ Registers new user successfully
- ✅ Returns 400 if username is missing
- ✅ Returns 400 if password is missing
- ✅ Returns 409 if username already exists
- ✅ Returns 409 if email already exists
- ✅ Hashes password before storing (bcrypt)
- ✅ Handles optional email field

### Protected API Endpoint Tests

All plant API tests have been updated to mock session authentication:

- `server/api/plants/__tests__/index.get.test.ts` - Mock authenticated user
- `server/api/plants/__tests__/index.post.test.ts` - Mock authenticated user
- `server/api/plants/__tests__/[id].get.test.ts` - Mock authenticated user
- `server/api/plants/__tests__/[id].put.test.ts` - Mock authenticated user
- `server/api/plants/__tests__/[id].delete.test.ts` - Mock authenticated user

All tests now use:

```typescript
vi.mock('~/server/utils/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
  }),
}));
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run specific test suites

```bash
# Session utility tests
npm test -- server/utils/__tests__/session.test.ts

# Authentication endpoint tests
npm test -- server/api/auth/__tests__/auth.test.ts

# Plant API tests
npm test -- server/api/plants/__tests__/

# Watch mode for development
npm test -- --watch
```

### Run with coverage

```bash
npm run test:coverage
```

## Test Utilities

### Mock H3 Event

Located in `test/mocks/h3-events.ts`, creates mock HTTP events for testing:

```typescript
const event = createMockH3Event({
  body: { username: 'test', password: 'pass' },
  params: { id: '1' },
  query: { filter: 'active' },
});
```

### Database Test Utilities

Located in `test/setup.ts`:

- `useDBTestUtils()` - Creates in-memory SQLite database with schema
- `useH3TestUtils()` - Mocks H3/Nuxt utilities

## Mock Strategy

### Session Mocking

For testing endpoints that require authentication, we mock the session utilities rather than creating actual sessions:

```typescript
vi.mock('~/server/utils/session', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
  }),
}));
```

This approach:

- Isolates the unit under test
- Faster test execution
- No need for session setup/teardown
- Easy to test different authentication states

### Testing Unauthenticated Access

To test unauthorized access:

```typescript
vi.mocked(requireAuth).mockRejectedValueOnce(
  createError({
    statusCode: 401,
    statusMessage: 'Unauthorized',
  })
);
```

## Integration Testing

For end-to-end testing of the authentication flow:

1. Create a real session in test database
2. Extract session cookie
3. Make requests with cookie
4. Verify session persistence

Example:

```typescript
const session = await createSession(userId);
const response = await fetch('/api/plants', {
  headers: {
    Cookie: `plantkeeper_session=${session.id}`,
  },
});
```

## Future Test Improvements

1. **Integration tests** for complete auth flow
2. **Session expiration tests** with time manipulation
3. **Concurrency tests** for session creation
4. **Performance tests** for session lookup
5. **Security tests** for cookie attributes
6. **CSRF protection tests** when implemented
7. **Rate limiting tests** when implemented
