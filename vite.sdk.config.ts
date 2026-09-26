import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: 'src/sdk/dodo-checkout.ts',
      name: 'DodoCheckoutSDK',
      formats: ['iife'],
      fileName: () => 'dodo-checkout.js',
    },
    outDir: 'dist/sdk',
    emptyOutDir: false,
    minify: true,
  },
})
