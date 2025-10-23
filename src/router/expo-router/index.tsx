import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Linking,
  Pressable,
  Text,
  type GestureResponderEvent,
  type PressableProps,
} from "react-native";

type SlotProps = {
  children?: React.ReactNode;
  name?: "index";
};

type LoadedRoute = React.ComponentType | null;

type RouterContextValue = {
  pathname: string;
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  prefetch: (href: string) => Promise<void>;
};

const RouterContext = createContext<RouterContextValue | null>(null);

function getInitialPathname(): string {
  if (typeof window !== "undefined" && typeof window.location?.pathname === "string") {
    const current = window.location.pathname.trim();
    return current ? current : "/";
  }

  return "/";
}

function normalizeHref(href: string): string {
  if (!href) return "/";

  const cleaned = href.split(/[?#]/)[0]?.trim() ?? "";
  if (!cleaned) return "/";

  if (cleaned.startsWith("/")) {
    return cleaned === "/" ? "/" : cleaned.replace(/\/+$/, "");
  }

  return `/${cleaned.replace(/\/+$/, "")}`;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function loadRoute(pathname: string): LoadedRoute {
  const normalized = normalizeHref(pathname);
  const trimmed = normalized === "/" ? "index" : normalized.replace(/^\//, "");
  const candidates = [
    `../../../app/${trimmed}`,
    `../../../app/${trimmed}/index`,
  ];

  for (const candidate of candidates) {
    try {
      // Metro will resolve the TypeScript file at runtime.
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const routeModule = require(candidate);
      const component = routeModule.default ?? routeModule;
      if (typeof component === "function") {
        return component as React.ComponentType;
      }
    } catch (_error) {
      // Continue searching other candidate paths.
      continue;
    }
  }

  if (trimmed !== "index") {
    return loadRoute("/");
  }

  return null;
}

type RouterProviderProps = {
  children: React.ReactNode;
};

export function RouterProvider({ children }: RouterProviderProps): React.ReactElement {
  const initialPathnameRef = useRef<string>(getInitialPathname());
  const historyStackRef = useRef<string[]>([initialPathnameRef.current]);
  const historyIndexRef = useRef<number>(0);
  const [pathname, setPathname] = useState<string>(initialPathnameRef.current);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePopState = () => {
      const nextPath = window.location.pathname || "/";
      const normalized = normalizeHref(nextPath);
      historyStackRef.current = [normalized];
      historyIndexRef.current = 0;
      setPathname(normalized);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const updatePathname = useCallback((next: string, method: "push" | "replace") => {
    const normalized = normalizeHref(next);

    if (method === "push") {
      if (historyIndexRef.current < historyStackRef.current.length - 1) {
        historyStackRef.current = historyStackRef.current.slice(0, historyIndexRef.current + 1);
      }
      historyStackRef.current.push(normalized);
      historyIndexRef.current = historyStackRef.current.length - 1;
    } else {
      historyStackRef.current[historyIndexRef.current] = normalized;
    }

    if (typeof window !== "undefined" && window.history) {
      try {
        if (method === "push") {
          window.history.pushState(null, "", normalized || "/");
        } else {
          window.history.replaceState(null, "", normalized || "/");
        }
      } catch (error) {
        console.warn("Failed to update history state", error);
      }
    }

    setPathname(normalized || "/");
  }, []);

  const push = useCallback(
    (href: string) => {
      if (isExternalHref(href)) {
        Linking.openURL(href).catch((error) => {
          console.warn("Failed to open external link", error);
        });
        return;
      }

      updatePathname(href, "push");
    },
    [updatePathname],
  );

  const replace = useCallback(
    (href: string) => {
      if (isExternalHref(href)) {
        Linking.openURL(href).catch((error) => {
          console.warn("Failed to open external link", error);
        });
        return;
      }

      updatePathname(href, "replace");
    },
    [updatePathname],
  );

  const back = useCallback(() => {
    if (typeof window !== "undefined" && window.history && window.history.length > 1) {
      window.history.back();
      return;
    }

    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const previous = historyStackRef.current[historyIndexRef.current] ?? "/";
      setPathname(previous);
    }
  }, []);

  const contextValue = useMemo<RouterContextValue>(
    () => ({
      pathname,
      push,
      replace,
      back,
      prefetch: async () => {
        // The stub router does not support asset prefetching yet.
      },
    }),
    [pathname, push, replace, back],
  );

  return <RouterContext.Provider value={contextValue}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }

  return context;
}

export function usePathname(): string {
  return useRouter().pathname;
}

export function Slot({ children }: SlotProps): React.ReactElement | null {
  if (children) {
    return <>{children}</>;
  }

  const { pathname } = useRouter();
  const routeKey = useMemo(() => normalizeHref(pathname), [pathname]);
  const RouteComponent = useMemo(() => loadRoute(routeKey), [routeKey]);

  if (!RouteComponent) {
    return null;
  }

  return <RouteComponent />;
}

type LinkProps = Omit<PressableProps, "onPress"> & {
  href: string;
  replace?: boolean;
  asChild?: boolean;
  children: React.ReactNode;
  onPress?: PressableProps["onPress"];
};

export function Link({ href, replace, asChild, children, onPress, ...rest }: LinkProps): React.ReactElement {
  const router = useRouter();

  const handleNavigate = useCallback(() => {
    if (replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  }, [href, replace, router]);

  const handlePress = useCallback(
    (event?: GestureResponderEvent) => {
      if (event?.defaultPrevented) return;
      handleNavigate();
    },
    [handleNavigate],
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onPress: (event: GestureResponderEvent) => {
        if (typeof children.props?.onPress === "function") {
          children.props.onPress(event);
        }
        if (!event?.defaultPrevented) {
          handlePress(event);
        }
      },
    });
  }

  return (
    <Pressable
      accessibilityRole="link"
      {...rest}
      onPress={(event) => {
        if (typeof onPress === "function") {
          onPress(event);
        }
        handlePress(event);
      }}
    >
      {typeof children === "string" ? <Text>{children}</Text> : children}
    </Pressable>
  );
}

type StackProps = {
  children?: React.ReactNode;
};

type StackScreenProps = {
  name: string;
  options?: Record<string, unknown>;
};

function StackScreen(_props: StackScreenProps): null {
  return null;
}

export function Stack({ children }: StackProps): React.ReactElement {
  return (
    <>
      {children}
      <Slot />
    </>
  );
}

Stack.Screen = StackScreen;

export default Slot;
