import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Unit and component tests exercise the deterministic storyboard regardless
  // of whether the running Docker UI is configured for the real API.
  define: {
    'import.meta.env.VITE_USE_MOCKS': JSON.stringify('true'),
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    restoreMocks: true,
  },
})
