import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The dev server forwards /api to the backend, so the browser sees a single origin:
// the refresh cookie (SameSite=Strict, path /api/auth) is sent and no CORS is needed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:4000',
    },
  },
});
