import { defineConfig } from 'vite'

export default defineConfig({
  base: '/monster-tcg/',
  root: '.',
  server: {
    port: 3000,
    open: true,
    host: true,
    hmr: {
      overlay: true
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  esbuild: {
    target: 'es2020'
  }
})
