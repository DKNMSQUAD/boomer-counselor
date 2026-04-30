import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://boomercounselor.com/essay-feedback/
export default defineConfig({
  base: '/essay-feedback/',
  plugins: [react()],
})
