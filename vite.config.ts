import { defineConfig } from 'vite'
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { postProvider, pageProvider } from './plugin/content_provider'
import { contentAssetPlugin } from './plugin/asset_server'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    }
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // 仅将 smart-image 视为自定义元素，避免误伤 router-view/router-link
          isCustomElement: (tag) => tag === 'smart-image'
        }
      }
    }),
    tailwindcss(),
    contentAssetPlugin(),
    postProvider(path.resolve(import.meta.dirname, "data/notes")),
    pageProvider(path.resolve(import.meta.dirname, "data/pages")),
  ],
})
