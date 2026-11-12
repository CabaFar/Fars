import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'SHAWARMA_'],
  base: '/Fars/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cash: resolve(__dirname, 'cash.html'),
        inventory: resolve(__dirname, 'inventory.html'),
        hr: resolve(__dirname, 'hr.html'),
        street: resolve(__dirname, 'street/index.html'),
        streetCash: resolve(__dirname, 'street/cash.html'),
        streetInventory: resolve(__dirname, 'street/inventory.html'),
        streetHr: resolve(__dirname, 'street/hr.html'),
      },
    },
  },
})
