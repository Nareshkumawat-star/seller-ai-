import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/api/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    restoreMocks: true,
    testTimeout: 15_000,
  },
});
