import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'  // hoặc vue, svelte...

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {               // mọi request bắt đầu bằng /api
        target: 'http://localhost:8000',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '')  // nếu backend không có prefix /api thì thêm dòng này
      }
    }
  }
})
