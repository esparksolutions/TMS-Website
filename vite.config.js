import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/TMS-Website/',
  plugins: [react()],
})
