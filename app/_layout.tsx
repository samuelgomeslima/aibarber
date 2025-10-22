import React from "react";
import { Slot } from "expo-router";

import { AuthGate } from "../src/components/AuthGate";

export default function RootLayout(): React.ReactElement {
  return (
    <AuthGate>
      <Slot />
    </AuthGate>
  );
}
