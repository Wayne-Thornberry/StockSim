import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/StockSim/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '