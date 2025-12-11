import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables (like API_KEY) from the deployment environment
  // Fix: Use '.' instead of process.cwd() to prevent TS error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // This allows 'process.env.API_KEY' to work in your frontend code
      // by replacing it with the actual value during the build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});