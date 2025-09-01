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
      host: 'localhost', // HMR için localhost kullan (WebSocket hatası için)
      port: 5173
    }
  },
  // Eğer HMR sorunu devam ederse bu satırı ekleyin:
  // hmr: false, // HMR'ı tamamen devre dışı bırak
})
