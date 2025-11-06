import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: [
      'gorevtakip.yildiz.local',
      'localhost',
      '127.0.0.1',
      '.yildiz.local'
    ],
    hmr: {
      clientPort: 5173,
      host: 'localhost'//172.17.0.22
    }
  }
})