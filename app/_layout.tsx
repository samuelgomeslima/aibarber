import React from "react";
import { Slot } from "expo-router";

import { AuthGate } from "../src/components/AuthGate";
import { DashboardLayout } from "../src/components/layout/DashboardLayout";

export default function RootLayout(): React.ReactElement {
  return (
    <AuthGate>
      <DashboardLayout>
        <Slot />
      </DashboardLayout>
    </AuthGate>
  );
}
