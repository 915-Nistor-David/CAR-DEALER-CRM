import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // VITE_API_URL e copt in bundle la build (src/services/api.ts). Fallback-ul de
  // acolo, "http://localhost:5100", e corect pentru `npm run dev` — dar intr-un
  // build de productie inseamna un build verde si o aplicatie complet moarta,
  // descoperita abia pe telefonul dealerului. Deci oprim build-ul aici.
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), '')
    const url = env.VITE_API_URL
    if (!url) {
      throw new Error(
        'VITE_API_URL lipseste — build oprit.\n' +
        'Fara ea, bundle-ul ar arata spre http://localhost:5100. Vezi .env.example.'
      )
    }
    // assetUrl construieste `${API_ORIGIN}/${path}`, deci un slash final da
    // "//vehicles/...". Calea dubla nu se potriveste cu semnatura HMAC calculata
    // de backend si FIECARE poza intoarce 403 "Link expirat sau invalid".
    if (url.endsWith('/')) {
      throw new Error(`VITE_API_URL nu accepta slash final: ${url}`)
    }
  }

  return {
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
  }
})
