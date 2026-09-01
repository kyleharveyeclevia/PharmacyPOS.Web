import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_NAME__: JSON.stringify(packageJson.name),
    __APP_VERSION_DESCRIPTION__: JSON.stringify(packageJson.versiondescription),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'https://localhost:57086', changeOrigin: true, secure: false },
      // Note: the hardware agent's SignalR hub is intentionally NOT proxied
      // here. The frontend connects to it directly on localhost (see
      // VITE_HARDWARE_AGENT_URL / HardwareAgentContext.jsx) — the backend
      // has no involvement in that connection.
    },
  },
});
