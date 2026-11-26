import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Flow 2.0 (Vercel version) — plain static Vite build.
// No server, no proprietary runtime, no environment variables.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
