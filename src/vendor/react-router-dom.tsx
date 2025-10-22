import React, {
  PropsWithChildren,
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface Location {
  pathname: string;
}

type NavigateOptions = {
  replace?: boolean;
};

type RouterContextValue = {
  location: Location;
  navigate: (to: string, options?: NavigateOptions) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

function getInitialPathname(): string {
  if (typeof window === "undefined" || !window.location) {
    return "/";
  }
  return window.location.pathname || "/";
}

export function BrowserRouter({ children }: PropsWithChildren) {
  const [pathname, setPathname] = useState(() => getInitialPathname());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handlePopState = () => {
      setPathname(window.location.pathname || "/");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: NavigateOptions) => {
    setPathname(to);
    if (typeof window !== "undefined") {
      if (options?.replace) {
        window.history.replaceState(null, "", to);
      } else {
        window.history.pushState(null, "", to);
      }
    }
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({
      location: { pathname },
      navigate,
    }),
    [navigate, pathname],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function matchPath(expected: string, actual: string): boolean {
  if (!expected || expected === "/") {
    return actual === "/";
  }
  if (!expected.startsWith("/")) {
    expected = `/${expected}`;
  }
  return actual === expected;
}

interface RouteProps {
  path: string;
  element: ReactNode;
}

export function Routes({ children }: { children: ReactNode }) {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("Routes must be used within a BrowserRouter");
  }

  let element: ReactNode = null;
  React.Children.forEach(children, (child) => {
    if (element !== null) {
      return;
    }
    if (!React.isValidElement<RouteProps>(child)) {
      return;
    }
    if (matchPath(child.props.path, context.location.pathname)) {
      element = child.props.element;
    }
  });

  return <>{element}</>;
}

export function Route(_props: RouteProps) {
  return null;
}

export function useNavigate() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useNavigate must be used within a BrowserRouter");
  }
  return context.navigate;
}

export function useLocation(): Location {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useLocation must be used within a BrowserRouter");
  }
  return context.location;
}

interface LinkProps extends PropsWithChildren {
  to: string;
  onPress?: () => void;
}

export function Link({ to, children, onPress }: LinkProps): ReactElement {
  const navigate = useNavigate();
  const handlePress = useCallback(() => {
    onPress?.();
    navigate(to);
  }, [navigate, onPress, to]);
  return <>{React.cloneElement(children as ReactElement, { onPress: handlePress })}</>;
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);
  return null;
}
