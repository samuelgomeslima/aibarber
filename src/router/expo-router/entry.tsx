import React from "react";

import { RouterProvider } from ".";

type LayoutComponent = React.ComponentType | null;

function loadRootLayout(): LayoutComponent {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const layoutModule = require("../../../app/_layout");
    return (layoutModule.default ?? layoutModule) as React.ComponentType;
  } catch (error) {
    console.error("Failed to load the root layout", error);
    return null;
  }
}

export default function ExpoRouterEntry(): React.ReactElement | null {
  const LayoutComponent = loadRootLayout();

  if (!LayoutComponent) {
    return null;
  }

  return (
    <RouterProvider>
      <LayoutComponent />
    </RouterProvider>
  );
}
