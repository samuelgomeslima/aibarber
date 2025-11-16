import React, { useMemo } from "react";
import { Slot, useSegments } from "expo-router";

import { AuthGate } from "../src/components/AuthGate";
import { ThemeProvider } from "../src/contexts/ThemeContext";

const PUBLIC_SEGMENTS = new Set(["client-booking"]);

export default function RootLayout(): React.ReactElement {
  const segments = useSegments();
  const firstSegment = segments[0];
  const isPublicRoute = useMemo(() => {
    if (!firstSegment) {
      return false;
    }
    return PUBLIC_SEGMENTS.has(firstSegment);
  }, [firstSegment]);

  return (
    <ThemeProvider>
      {isPublicRoute ? (
        <Slot />
      ) : (
        <AuthGate>
          <Slot />
        </AuthGate>
      )}
    </ThemeProvider>
  );
}
