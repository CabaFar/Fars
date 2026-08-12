import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Fars/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cash: resolve(__dirname, 'cash.html'),
        inventory: resolve(__dirname, 'inventory.html'),
      },
    },
  },
})
