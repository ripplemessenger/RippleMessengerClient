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
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            /* xrpl - the largest single dependency (~500KB+) with ripple-keypairs, @scure/*, @xrplf/*, bignumber.js */
            if (id.includes('/xrpl/') || id.includes('ripple-') || id.includes('@xrplf/') || id.includes('@scure/') || id.includes('@noble/') || id.includes('bignumber.js')) return 'vendor-xrpl'
            /* Crypto primitives: elliptic, crypto-js, browserify polyfills */
            if (id.includes('elliptic') || id.includes('crypto-js') || id.includes('crypto-browserify') || id.includes('readable-stream') || id.includes('cipher-base') || id.includes('hash-base') || id.includes('stream-browserify') || id.includes('asn1.js') || id.includes('pbkdf2') || id.includes('/browserify')) return 'vendor-crypto'
            /* Markdown: remark, rehype, micromark, unified, hast, mdast, unist */
            if (id.includes('react-markdown') || id.includes('remark-') || id.includes('rehype-') || id.includes('micromark') || id.includes('/unified') || id.includes('hast-util') || id.includes('mdast-util') || id.includes('unist-util')) return 'vendor-markdown'
            /* Tauri APIs */
            if (id.includes('@tauri-apps')) return 'vendor-tauri'
            /* React core + routing */
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-redux/') || id.includes('/react-router/')) return 'vendor-react'
            /* UI: icons, babel runtime helpers */
            if (id.includes('react-icons') || id.includes('@babel/runtime')) return 'vendor-ui'
            /* AJV + JSON schema validation utilities */
            if (id.includes('ajv') || id.includes('fast-deep-equal') || id.includes('json-schema-traverse') || id.includes('fast-uri') || id.includes('require-from-string')) return 'vendor-ajv'
            /* Redux Toolkit: immer, redux-thunk, standard-schema, nanoid */
            if (id.includes('/immer') || id.includes('/redux-thunk') || id.includes('/redux/') || id.includes('@standard-schema/')) return 'vendor-rtk'
            /* Saga: redux-saga core + reselect */
            if (id.includes('redux-saga') || id.includes('/reselect')) return 'vendor-saga'
            /* Lodash (pulled in by xrpl, large standalone utility) */
            if (id.includes('/lodash/')) return 'vendor-lodash'
            /* Utility libs: buffer polyfill, eventemitter, decimal math */
            if (id.includes('decimal.js') || id.includes('react-cropper') || id.includes('cropperjs') || id.includes('/buffer/') || id.includes('base64-js') || id.includes('ieee754') || id.includes('eventemitter3')) return 'vendor-utils'
            return 'vendor'
          }
          if (id.includes('store/sagas/messenger')) return 'messenger-sagas'
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
      crypto: 'crypto-browserify'
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
