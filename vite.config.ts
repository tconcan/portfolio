import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000 },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // Core vendor code in its own long-cached chunk. Page-only libraries
        // (d3-geo, topojson for the travel map) stay with their lazy chunk.
        manualChunks: (id) =>
          /node_modules\/(react|react-dom|react-router|scheduler|motion|motion-dom|motion-utils|framer-motion)\//.test(id)
            ? "vendor"
            : undefined,
      },
    },
  },
});
