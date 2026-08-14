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
    // `API_TARGET` (with `--port`) lets a second instance run beside the default
    // one on its own throwaway database — an agentic Feature Path must not end up
    // talking to whatever server already holds :3001.
    proxy: {
      "/api": process.env.API_TARGET ?? "http://localhost:3001",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    // Board tests walk a whole Game through userEvent clicks; jsdom + a real
    // rule engine put them past the 5s default on a loaded machine, which
    // showed up as a flake (green in isolation, red in a full run).
    testTimeout: 20000,
  },
});
