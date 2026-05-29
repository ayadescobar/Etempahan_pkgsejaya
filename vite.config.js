import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Etempahan_pkgsejaya/',
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
