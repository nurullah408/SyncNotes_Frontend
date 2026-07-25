import { defineConfig } from 'vite';
import path from "path";
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    svgr({
      svgrOptions: {

      }
    }),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  preview: {
    port: 5174,
    strictPort: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    origin: 'http://localhost:5173',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, './src'),
    }
  }
})
