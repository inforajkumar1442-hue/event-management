import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const apiUrl = import.meta.env.VITE_API_URL;


export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target:   apiUrl || "",
        changeOrigin: true,
      },
      '/uploads': {
        target: apiUrl || "",
        changeOrigin: true,
      },
    },
  },
});
