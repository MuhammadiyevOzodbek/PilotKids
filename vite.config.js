import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Katta kutubxonalarni alohida vendor chunk'larga ajratamiz — bittasi yangilansa,
    // qolganlari keshdan qayta ishlatiladi (three eng og'iri, alohida saqlanadi).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('three') || id.includes('@react-three')) return 'three'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('react-router') || id.includes('/react-dom/') || id.includes('/react/')) return 'react-vendor'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
