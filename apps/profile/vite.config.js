import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://boomercounselor.com/profile/
export default defineConfig({
  base: '/profile/',
  plugins: [react()],
})
