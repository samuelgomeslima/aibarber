import React from "react";
import { Pressable } from "react-native";

import { normalizeHref, useNavigationContext } from "./navigation";

export type { NavigationProviderProps } from "./navigation";

type SlotProps = {
  children?: React.ReactNode;
  name?: "index";
};

type LinkProps = {
  href: string;
  asChild?: boolean;
  children: React.ReactElement;
  onPress?: () => void;
};

type LoadedRoute = React.ComponentType | null;

type RouteModule = {
  default?: React.ComponentType;
};

function requireRouteModule(moduleId: string): LoadedRoute {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const routeModule: RouteModule = require(moduleId);
    return (routeModule.default ?? routeModule) as React.ComponentType;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "MODULE_NOT_FOUND"
    ) {
      return null;
    }

    console.error(`Failed to load route module "${moduleId}"`, error);
    return null;
  }
}

function loadRoute(pathname: string): LoadedRoute {
  const normalized = normalizeHref(pathname);
  const routeKey = normalized === "/" ? "index" : normalized.slice(1);
  const candidates = [`../../../app/${routeKey}`, `../../../app/${routeKey}/index`];

  for (const candidate of candidates) {
    const component = requireRouteModule(candidate);
    if (component) {
      return component;
    }
  }

  console.warn(`No route found for pathname "${pathname}"`);
  const fallback = requireRouteModule("../../../app/index");
  return fallback;
}

function mergePressHandlers(
  childOnPress: ((event: unknown) => void) | undefined,
  linkOnPress: () => void,
) {
  return (event: unknown) => {
    linkOnPress();
    if (typeof childOnPress === "function") {
      childOnPress(event);
    }
  };
}

export function Link({ href, asChild = false, children, onPress }: LinkProps): React.ReactElement {
  const { navigate } = useNavigationContext();
  const normalizedHref = normalizeHref(href);

  const handlePress = React.useCallback(() => {
    navigate(normalizedHref);
    onPress?.();
  }, [navigate, normalizedHref, onPress]);

  if (asChild) {
    return React.cloneElement(children, {
      onPress: mergePressHandlers(children.props.onPress, handlePress),
    });
  }

  return <Pressable onPress={handlePress}>{children}</Pressable>;
}

export function usePathname(): string {
  const { pathname } = useNavigationContext();
  return pathname;
}

export function Slot({ children }: SlotProps): React.ReactElement | null {
  if (children) {
    return <>{children}</>;
  }

  const { pathname } = useNavigationContext();
  const RouteComponent = loadRoute(pathname);

  if (!RouteComponent) {
    return null;
  }

  return <RouteComponent />;
}

export default Slot;
