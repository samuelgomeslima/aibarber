import path from "node:path";
import { defineConfig } from "vitest/config";

const expoRouterAlias = path.resolve(__dirname, "src/router/expo-router");

export default defineConfig({
  resolve: {
    alias: {
      "expo-router": expoRouterAlias,
      "expo-router/entry": path.resolve(expoRouterAlias, "entry"),
      "react-native": path.resolve(__dirname, "tests/mocks/reactNativeStub.ts"),
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
