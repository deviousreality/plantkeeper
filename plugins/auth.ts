// plugins/auth.ts
export default defineNuxtPlugin(async () => {
  const auth = useAuth();

  // Initialize auth state from server session
  await auth.initAuth();
});
