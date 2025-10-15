import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/bookingService/setup.ts"],
    environment: "node",
    reporters: "default",
  },
});
