// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuth();

  // Initialize auth from server session if not already done
  if (!auth.user.value) {
    await auth.initAuth();
  }

  // If user is authenticated, allow access
  if (auth.isAuthenticated.value) {
    return;
  }

  // If not authenticated, redirect to login but preserve the intended destination
  return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
});
