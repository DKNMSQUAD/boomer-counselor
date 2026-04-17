import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://boomercounselor.com/careers/
export default defineConfig({
  base: '/careers/',
  plugins: [react()],
})
