import React from "react";

import { NavigationProvider, normalizeHref } from "./navigation";

type LayoutComponent = React.ComponentType | null;

type NavigationState = {
  pathname: string;
  setPathname: React.Dispatch<React.SetStateAction<string>>;
};

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

function getInitialPathname(): string {
  if (typeof window !== "undefined" && typeof window.location?.pathname === "string") {
    return normalizeHref(window.location.pathname);
  }

  return "/assistant";
}

function useNavigationState(): NavigationState {
  const [pathname, setPathname] = React.useState<string>(() => getInitialPathname());

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handlePopState = () => {
      setPathname(normalizeHref(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return { pathname, setPathname };
}

export default function ExpoRouterEntry(): React.ReactElement | null {
  const LayoutComponent = loadRootLayout();
  const { pathname, setPathname } = useNavigationState();

  const navigate = React.useCallback(
    (href: string) => {
      const normalized = normalizeHref(href);
      setPathname(normalized);

      if (
        typeof window !== "undefined" &&
        typeof window.history?.pushState === "function"
      ) {
        window.history.pushState({}, "", normalized);
      }
    },
    [setPathname],
  );

  const navigationValue = React.useMemo(
    () => ({ pathname, navigate }),
    [pathname, navigate],
  );

  if (!LayoutComponent) {
    return null;
  }

  return (
    <NavigationProvider value={navigationValue}>
      <LayoutComponent />
    </NavigationProvider>
  );
}
