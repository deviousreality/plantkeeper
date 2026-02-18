import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import type { User } from '../useAuth';

// Create mock state refs
const userStateRef = ref<User | null>(null);
const errorStateRef = ref<string | null>(null);

// Mock Nuxt composables BEFORE importing useAuth
vi.mock('#app', () => ({
  useState: (key: string, init: () => any) => {
    if (key === 'auth.user') return userStateRef;
    if (key === 'auth.error') return errorStateRef;
    return ref(init());
  },
  navigateTo: (path: string) => mockNavigateTo(path),
}));

// Setup other mocks
const mockFetch = vi.fn();
const mockNavigateTo = vi.fn().mockResolvedValue(undefined);

vi.stubGlobal('$fetch', mockFetch);
vi.stubGlobal('navigateTo', mockNavigateTo);

// Import composable AFTER mocks are set up
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset state
    userStateRef.value = null;
    errorStateRef.value = null;

    // Mock process.client
    Object.defineProperty(globalThis, 'process', {
      value: { client: true },
      writable: true,
      configurable: true,
    });
  });

  describe('initAuth', () => {
    it('should handle session check errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { initAuth } = useAuth();
      await initAuth();

      expect(userStateRef.value).toBeNull();
      expect(errorStateRef.value).toBeNull();
    });

    it('should not fetch session on server side', async () => {
      Object.defineProperty(globalThis, 'process', {
        value: { client: false },
        writable: true,
        configurable: true,
      });

      const { initAuth } = useAuth();
      await initAuth();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should set and clear loading state during login', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      mockFetch.mockResolvedValueOnce(mockUser);

      const { login, isLoading } = useAuth();
      expect(isLoading.value).toBe(false);

      const loginPromise = login('testuser', 'password123');
      expect(isLoading.value).toBe(true);

      await loginPromise;
      expect(isLoading.value).toBe(false);
    });
  });

  describe('state exposure', () => {
    it('should expose user state', () => {
      const { user } = useAuth();
      expect(user).toBeDefined();
    });

    it('should expose isAuthenticated computed property', () => {
      const { isAuthenticated } = useAuth();
      expect(isAuthenticated).toBeDefined();
      expect(typeof isAuthenticated.value).toBe('boolean');
    });

    it('should expose error state', () => {
      const { error } = useAuth();
      expect(error).toBeDefined();
    });

    it('should expose isLoading state', () => {
      const { isLoading } = useAuth();
      expect(isLoading).toBeDefined();
      expect(typeof isLoading.value).toBe('boolean');
    });
  });

  describe('API interactions', () => {
    it('should call fetch with correct parameters for login', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      mockFetch.mockResolvedValueOnce(mockUser);

      const { login } = useAuth();
      await login('testuser', 'password123');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: { username: 'testuser', password: 'password123' },
        credentials: 'include',
      });
    });

    it('should call fetch with correct parameters for register', async () => {
      const mockUser = { id: 2, username: 'newuser', email: 'new@example.com' };
      mockFetch.mockResolvedValueOnce(mockUser);

      const { register } = useAuth();
      await register('newuser', 'password123', 'new@example.com');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: { username: 'newuser', password: 'password123', email: 'new@example.com' },
        credentials: 'include',
      });
    });

    it('should return success response on successful login', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      mockFetch.mockResolvedValueOnce(mockUser);

      const { login } = useAuth();
      const result = await login('testuser', 'password123');

      expect(result).toEqual({ success: true });
    });

    it('should return error response on failed login', async () => {
      const errorMessage = 'Invalid credentials';
      mockFetch.mockRejectedValueOnce({
        data: { message: errorMessage },
      });

      const { login } = useAuth();
      const result = await login('testuser', 'wrongpassword');

      expect(result).toEqual({ success: false, error: errorMessage });
    });

    it('should return default error message when error has no message', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { login } = useAuth();
      const result = await login('testuser', 'password123');

      expect(result).toEqual({ success: false, error: 'Login failed' });
    });

    it('should return success response on successful registration', async () => {
      const mockUser = { id: 2, username: 'newuser', email: 'new@example.com' };
      mockFetch.mockResolvedValueOnce(mockUser);

      const { register } = useAuth();
      const result = await register('newuser', 'password123', 'new@example.com');

      expect(result).toEqual({ success: true });
    });

    it('should return error response on failed registration', async () => {
      const errorMessage = 'Username already exists';
      mockFetch.mockRejectedValueOnce({
        data: { message: errorMessage },
      });

      const { register } = useAuth();
      const result = await register('existinguser', 'password123', 'email@example.com');

      expect(result).toEqual({ success: false, error: errorMessage });
    });
  });
});
