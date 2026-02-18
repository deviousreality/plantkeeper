<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
// Initialize authentication on app mount
const auth = useAuth();

onMounted(async () => {
  await auth.initAuth();
});
</script>
