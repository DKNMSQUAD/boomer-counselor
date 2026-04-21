import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://boomercounselor.com/tutor-counselor/
export default defineConfig({
  base: '/tutor-counselor/',
  plugins: [react()],
})
