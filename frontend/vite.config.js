import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from 'node:url';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
    proxy: { '/api': { target: process.env.BACKEND_URL || env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true } },
  },
};
});
