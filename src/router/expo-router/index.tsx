import React from "react";

type SlotProps = {
  children?: React.ReactNode;
  name?: "index";
};

type LoadedRoute = React.ComponentType | null;

type RouteName = "index" | "client-booking";

type RouteLoader = () => LoadedRoute;

function getPathSegments(): string[] {
  if (typeof window === "undefined" || typeof window.location?.pathname !== "string") {
    return [];
  }

  return window.location.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function useSegments(): string[] {
  const [segments, setSegments] = React.useState<string[]>(() => getPathSegments());

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const updateSegments = () => {
      setSegments(getPathSegments());
    };

    window.addEventListener("popstate", updateSegments);
    window.addEventListener("hashchange", updateSegments);

    return () => {
      window.removeEventListener("popstate", updateSegments);
      window.removeEventListener("hashchange", updateSegments);
    };
  }, []);

  return segments;
}

function resolveRouteName(segments: string[]): RouteName {
  if (segments[0] === "client-booking") {
    return "client-booking";
  }

  return "index";
}

const ROUTE_LOADERS: Record<RouteName, RouteLoader> = {
  index: () => {
    try {
      // Metro will resolve the TypeScript file at runtime.
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const routeModule = require("../../../app/index");
      return (routeModule.default ?? routeModule) as React.ComponentType;
    } catch (error) {
      console.error("Failed to load the default route", error);
      return null;
    }
  },
  "client-booking": () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const routeModule = require("../../../app/client-booking");
      return (routeModule.default ?? routeModule) as React.ComponentType;
    } catch (error) {
      console.error("Failed to load the client booking route", error);
      return null;
    }
  },
};

function loadRoute(routeName: RouteName): LoadedRoute {
  const loader = ROUTE_LOADERS[routeName] ?? ROUTE_LOADERS.index;
  const loaded = loader();

  if (!loaded && routeName !== "index") {
    return ROUTE_LOADERS.index();
  }

  return loaded;
}

export function Slot({ children }: SlotProps): React.ReactElement | null {
  if (children) {
    return <>{children}</>;
  }

  const segments = useSegments();
  const routeName = resolveRouteName(segments);
  const RouteComponent = loadRoute(routeName);

  if (!RouteComponent) {
    return null;
  }

  return <RouteComponent />;
}

export default Slot;
