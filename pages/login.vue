<!-- pages/login.vue -->
<template>
  <v-card-title class="text-center text-h4 mb-5">
    <v-icon
      size="large"
      class="me-2">
      mdi-nature-people
    </v-icon>
    PlantKeeper
  </v-card-title>
  <v-card-text>
    <v-form @submit.prevent="handleLogin">
      <v-text-field
        v-model="username"
        label="Username"
        prepend-icon="mdi-account"
        :rules="[rules.required]"
        required />

      <v-text-field
        v-model="password"
        label="Password"
        type="password"
        prepend-icon="mdi-lock"
        :rules="[rules.required]"
        required />

      <v-alert
        v-if="auth.error && auth.error.length > 0"
        type="error"
        class="mt-4"
        density="compact"
        variant="tonal">
        {{ auth.error }}
      </v-alert>

      <v-card-actions class="mt-4">
        <v-btn
          color="secondary"
          variant="text"
          to="/register"
          :disabled="isLoading">
          Register
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          type="submit"
          :loading="isLoading">
          Login
        </v-btn>
      </v-card-actions>
    </v-form>
  </v-card-text>
</template>

<script setup lang="ts">
import type { LocationQueryValue } from 'vue-router';

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
});

const auth = useAuth();
const route = useRoute();

const username = ref('');
const password = ref('');
const isLoading = ref(false);

// Clear any previous errors before rendering
auth.error.value = null;

// Helper function to safely get redirect URL
function getRedirectUrl(redirectQuery: LocationQueryValue | LocationQueryValue[] | undefined): string {
  if (typeof redirectQuery === 'string') {
    return redirectQuery;
  }
  return '/plants';
}

const rules = {
  required: (value: string) => !!value || 'Required.',
};

async function handleLogin(): Promise<void> {
  if (!username.value || !password.value) return;

  isLoading.value = true;
  try {
    const result = await auth.login(username.value, password.value);
    if (result.success) {
      // Redirect to intended page or default to /plants
      const redirectTo = getRedirectUrl(route.query['redirect']);
      await navigateTo(redirectTo);
    }
  } finally {
    isLoading.value = false;
  }
}
</script>
