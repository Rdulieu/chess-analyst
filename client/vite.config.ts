/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fail loudly if the port is taken (e.g. a stale instance) instead of
    // silently shifting to 5174 and breaking the "single command → :5173"
    // contract.
    strictPort: true,
    // The frontend fetches Games from the local API server (ADR-0002); Vite
    // proxies /api so the browser only ever talks to one origin in dev.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
