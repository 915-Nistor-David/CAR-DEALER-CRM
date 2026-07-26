import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Ascultam pe toate interfetele ca aplicatia sa poata fi deschisa de pe telefon
    // din aceeasi retea (vezi `npm run dev:lan` si .env.example).
    host: true,
    port: 5173,
    // Fara strictPort, un 5173 ocupat muta Vite silentios pe 5174 — port care nu e
    // in lista CORS a backendului, deci toate cererile ar cadea cu o eroare care
    // pare bug de server.
    strictPort: true,
  },
})
