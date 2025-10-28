import path from "node:path";
import { defineConfig } from "vitest/config";

const expoRouterAlias = path.resolve(__dirname, "src/router/expo-router");
const tanstackQueryAlias = path.resolve(__dirname, "src/query");

export default defineConfig({
  resolve: {
    alias: {
      "expo-router": expoRouterAlias,
      "expo-router/entry": path.resolve(expoRouterAlias, "entry"),
      "@tanstack/react-query": path.resolve(tanstackQueryAlias, "index"),
      "@tanstack/react-query/": `${tanstackQueryAlias}/`,
    },
  },
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/bookingService/setup.ts"],
    environment: "node",
    reporters: "default",
  },
});
