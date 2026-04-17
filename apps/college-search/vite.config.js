import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://boomercounselor.com/college-search/
export default defineConfig({
  base: '/college-search/',
  plugins: [react()],
})
