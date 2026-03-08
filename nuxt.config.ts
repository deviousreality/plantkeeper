// https://nuxt.com/docs/api/configuration/nuxt-config

import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
const isDevMode = process.env.NODE_ENV !== 'production';

export default defineNuxtConfig({
  ssr: false, // Disable server-side rendering
  compatibilityDate: '2025-05-15',
  devtools: { enabled: isDevMode },
  typescript: {
    strict: true,
    typeCheck: false, // Disable during build to avoid conflicts
    shim: false,
  },
  css: ['vuetify/styles'],
  build: {
    transpile: ['vuetify'],
  },
  modules: ['@nuxtjs/color-mode'],
  colorMode: {
    preference: 'system', // Default to system preference
    dataValue: 'theme', // activate data-theme in <html> tag
    classSuffix: '',
  },
  app: {
    head: {
      title: 'PlantKeeper',
      meta: [{ name: 'description', content: 'Keep track of your plants with PlantKeeper' }],
    },
  },
  runtimeConfig: {
    isDevMode: isDevMode,
    weatherApiKey: process.env.WEATHER_API_KEY || '',
    public: {},
  },
  nitro: {
    preset: 'node-server',
    output: {
      dir: process.env.NUXT_OUTPUT_DIR || './.dist',
      serverDir: process.env.NUXT_PUBLIC_SERVER || './.dist/server',
      publicDir: process.env.NUXT_PUBLIC_DIR || './.dist/public',
    },
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Content-Security-Policy':
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
        },
      },
      '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
      '/api/**': {
        cors: isDevMode,
        headers: isDevMode
          ? {}
          : {
              'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Allow-Credentials': 'true',
            },
      },
    },
  },
  vite: {
    plugins: [vuetify({ autoImport: true })],
    server: {
      fs: {
        allow: ['..'],
      },
    },
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
});
