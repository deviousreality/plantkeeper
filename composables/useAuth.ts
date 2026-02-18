// composables/useAuth.ts
import { ref, computed } from 'vue';

export interface User {
  id: number;
  username: string;
  email: string | null;
}

export const useAuth = () => {
  // Initialize user state - starts as null, will be verified from server session
  const user = useState<User | null>('auth.user', () => null);
  const error = useState<string | null>('auth.error', () => null);

  const isAuthenticated = computed(() => !!user.value);
  const isLoading = ref(false);

  // Check if user is already logged in (from server session)
  const initAuth = async () => {
    if (process.client && !user.value) {
      try {
        const response = await $fetch('/api/auth/session', {
          credentials: 'include', // Important for cookies
        });

        if (response) {
          user.value = response as User;
          error.value = null;
          console.log('User authenticated from session:', response);
        } else {
          // Not authenticated, clear state
          user.value = null;
          error.value = null;
        }
      } catch (e) {
        // Error fetching session, clear state
        user.value = null;
        error.value = null;
      }
    }
  };

  // Login function
  const login = async (username: string, password: string) => {
    error.value = null;
    isLoading.value = true;

    try {
      const response = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { username, password },
        credentials: 'include', // Important for cookies
      });

      user.value = response as User;
      console.log('User logged in:', user.value);
      return { success: true };
    } catch (e: any) {
      error.value = e.data?.message || 'Login failed';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };

  // Register function
  const register = async (username: string, password: string, email: string) => {
    error.value = null;
    isLoading.value = true;

    try {
      const response = await $fetch('/api/auth/register', {
        method: 'POST',
        body: { username, password, email },
        credentials: 'include', // Important for cookies
      });

      user.value = response as User;
      return { success: true };
    } catch (e: any) {
      error.value = e.data?.message || 'Registration failed';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Important for cookies
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      user.value = null;
      await navigateTo('/login');
    }
  };

  return {
    user: readonly(user),
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    initAuth,
  };
};
