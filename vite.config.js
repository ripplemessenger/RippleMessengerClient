import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: '',
    manifest: true,
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      }
    }
  },
  plugins: [react()],
  css: {
    postcss: './postcss.config.js'
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  define: {
    global: 'window',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      events: 'events'
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js 全局变量 polyfill
      define: {
        global: 'globalThis',
      },
      plugins: [
        {
          name: 'fix-node-globals-polyfill',
          setup(build) {
            build.onResolve({ filter: /_virtual-process-polyfill_/ }, () => ({ path: '_virtual-process-polyfill_' }))
          }
        }
      ]
    }
  }
}));
