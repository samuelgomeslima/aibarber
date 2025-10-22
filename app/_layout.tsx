import { Slot } from "expo-router";

import { AuthGate } from "../src/components/AuthGate";

export default function RootLayout() {
  return (
    <AuthGate>
      <Slot />
    </AuthGate>
  );
}
