import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement pour qu'elles soient accessibles via process.env
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Polyfill pour que le code existant utilisant process.env fonctionne
      'process.env': env
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  }
})