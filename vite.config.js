import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const hmrHost = process.env.VITE_HMR_HOST
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT

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
    // Özel host (ör. gorevtakip.yildiz.local) ile açarken localhost’a sabit HMR WebSocket hatası vermesin.
    // Ortam değişkeni yoksa Vite, isteğin Host’una göre HMR adresini kendisi seçer.
    ...(hmrHost
      ? {
          hmr: {
            protocol: 'ws',
            host: hmrHost,
            ...(hmrClientPort ? { clientPort: Number(hmrClientPort) } : {}),
          },
        }
      : {}),
  },
})