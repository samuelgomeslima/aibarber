import React from "react";
import { Slot } from "expo-router";

import { AuthGate } from "../src/components/AuthGate";
import { ThemeProvider } from "../src/contexts/ThemeContext";

export default function RootLayout(): React.ReactElement {
  return (
    <AuthGate>
      <ThemeProvider>
        <Slot />
      </ThemeProvider>
    </AuthGate>
  );
}
