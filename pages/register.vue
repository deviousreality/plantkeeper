<!-- pages/register.vue -->
<template>
  <v-card-title class="text-center text-h4 mb-5">
    <v-icon
      size="large"
      class="me-2">
      mdi-nature-people
    </v-icon>
    Create Account
  </v-card-title>
  <v-card-text>
    <v-form @submit.prevent="handleRegister">
      <v-text-field
        v-model="username"
        label="Username"
        prepend-icon="mdi-account"
        :rules="[rules.required]"
        required />

      <v-text-field
        v-model="email"
        label="Email"
        type="email"
        prepend-icon="mdi-email"
        :rules="[rules.required, rules.email]"
        required />

      <v-text-field
        v-model="password"
        label="Password"
        type="password"
        prepend-icon="mdi-lock"
        :rules="[rules.required, rules.minLength]"
        required
        hint="Password must be at least 6 characters" />

      <v-text-field
        v-model="confirmPassword"
        label="Confirm Password"
        type="password"
        prepend-icon="mdi-lock-check"
        :rules="[rules.required, rules.passwordMatch]"
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
          to="/login"
          :disabled="isLoading">
          Back to Login
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          type="submit"
          :loading="isLoading">
          Register
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
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
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
  email: (value: string) => {
    const pattern =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return pattern.test(value) || 'Invalid e-mail.';
  },
  minLength: (value: string) => (value && value.length >= 6) || 'Min 6 characters',
  passwordMatch: (value: string) => value === password.value || 'Passwords do not match',
};

async function handleRegister(): Promise<void> {
  if (!username.value || !password.value || !email.value || password.value !== confirmPassword.value) return;

  isLoading.value = true;
  try {
    const result = await auth.register(username.value, password.value, email.value);
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
