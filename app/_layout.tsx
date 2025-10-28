import React from "react";
import { Slot } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthGate } from "../src/components/AuthGate";
import { queryClient } from "../src/lib/queryClient";

export default function RootLayout(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Slot />
      </AuthGate>
    </QueryClientProvider>
  );
}
