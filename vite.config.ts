import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    hmr: {
      clientPort: 5173,
    },
    // File system polling: necesario en Windows+Docker (NTFS
    // no propaga inotify events al contenedor sin polling)
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
});
