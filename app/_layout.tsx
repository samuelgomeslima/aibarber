import React from "react";
import { Slot } from "expo-router";

import { AuthGate } from "../src/components/AuthGate";
import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function RootLayout() {
  return (
    <AuthGate>
      <AuthenticatedApp>
        <Slot />
      </AuthenticatedApp>
    </AuthGate>
  );
}
