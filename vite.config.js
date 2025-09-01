import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Tüm network interface'leri dinle
    port: 5173,
    strictPort: false,
    hmr: {
      host: '0.0.0.0' // HMR için de tüm interface'leri dinle
    }
  },
})
