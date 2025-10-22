import React from "react";

type SlotProps = {
  children?: React.ReactNode;
  name?: "index";
};

type LoadedRoute = React.ComponentType | null;

function loadRoute(): LoadedRoute {
  try {
    // Metro will resolve the TypeScript file at runtime.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const routeModule = require("../../../app/index");
    return (routeModule.default ?? routeModule) as React.ComponentType;
  } catch (error) {
    console.error("Failed to load the default route", error);
    return null;
  }
}

export function Slot({ children }: SlotProps): React.ReactElement | null {
  if (children) {
    return <>{children}</>;
  }

  const RouteComponent = loadRoute();
  if (!RouteComponent) {
    return null;
  }

  return <RouteComponent />;
}

export default Slot;
