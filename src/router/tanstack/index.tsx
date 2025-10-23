import React, { useContext, useMemo, useState } from "react";

export type RouteComponent = React.ComponentType;

export type RouteNode = {
  id: string;
  path: string;
  component: RouteComponent;
  parent?: RouteNode;
  children: RouteNode[];
};

type CreateRouteOptions = {
  getParentRoute: () => RouteNode;
  path: string;
  component: RouteComponent;
};

type CreateRootRouteOptions = {
  component: RouteComponent;
};

export type RouterState = {
  location: {
    pathname: string;
  };
};

type RouterMatch = RouteNode;

type RouterInstance = {
  routeTree: RouteNode;
  defaultPath: string;
  matchRoutes: (pathname: string) => RouterMatch[];
};

type RouterProviderProps = {
  router: RouterInstance;
};

type RouterNavigateOptions = {
  to: string;
};

type RouterContextValue = {
  state: RouterState;
  matches: RouterMatch[];
  navigate: (options: RouterNavigateOptions) => void;
};

const RouterContext = React.createContext<RouterContextValue | null>(null);
const OutletContext = React.createContext<React.ReactNode>(null);

let routeIdCounter = 0;

function ensureLeadingSlash(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path || "/";
}

function normalizePath(path: string): string {
  if (!path) return "/";
  const withLeading = ensureLeadingSlash(path);
  return withLeading === "" ? "/" : withLeading;
}

function trimSlashes(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

function findDefaultPath(routeTree: RouteNode): string {
  const indexChild = routeTree.children.find((child) => child.path === "/" || child.path === "");
  if (indexChild) {
    return normalizePath(indexChild.path || "/");
  }
  const firstChild = routeTree.children[0];
  if (firstChild) {
    return normalizePath(firstChild.path);
  }
  return "/";
}

function matchRouteTree(routeTree: RouteNode, pathname: string): RouterMatch[] {
  const matches: RouterMatch[] = [routeTree];
  const trimmed = trimSlashes(pathname);
  if (!trimmed) {
    const indexChild = routeTree.children.find((child) => child.path === "/" || child.path === "");
    if (indexChild) {
      matches.push(indexChild);
    }
    return matches;
  }

  const segments = trimmed.split("/");
  let current = routeTree;

  for (const segment of segments) {
    const next = current.children.find((child) => {
      const candidate = trimSlashes(child.path || "");
      return candidate === segment;
    });

    if (!next) {
      break;
    }
    matches.push(next);
    current = next;
  }

  if (matches.length === 1) {
    const indexChild = routeTree.children.find((child) => child.path === "/" || child.path === "");
    if (indexChild) {
      matches.push(indexChild);
    }
  }

  return matches;
}

function buildElementFromMatches(matches: RouterMatch[]): React.ReactElement | null {
  let element: React.ReactNode = null;

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const MatchComponent = match.component;
    element = (
      <OutletContext.Provider value={element}>
        <MatchComponent />
      </OutletContext.Provider>
    );
  }

  return element as React.ReactElement | null;
}

export function createRootRoute(options: CreateRootRouteOptions): RouteNode {
  return {
    id: `__root__-${routeIdCounter++}`,
    path: "/",
    component: options.component,
    children: [],
  };
}

export function createRoute(options: CreateRouteOptions): RouteNode {
  const parent = options.getParentRoute();
  const route: RouteNode = {
    id: `${parent.id}-${routeIdCounter++}`,
    path: options.path,
    component: options.component,
    parent,
    children: [],
  };

  parent.children.push(route);
  return route;
}

export function createRouter({
  routeTree,
  defaultPath,
}: {
  routeTree: RouteNode;
  defaultPath?: string;
}): RouterInstance {
  return {
    routeTree,
    defaultPath: defaultPath ? normalizePath(defaultPath) : findDefaultPath(routeTree),
    matchRoutes: (pathname: string) => matchRouteTree(routeTree, normalizePath(pathname)),
  };
}

export function RouterProvider({ router }: RouterProviderProps): React.ReactElement {
  const [pathname, setPathname] = useState(router.defaultPath);

  const matches = useMemo(() => {
    const resolvedMatches = router.matchRoutes(pathname);
    if (resolvedMatches.length > 1) {
      return resolvedMatches;
    }
    return router.matchRoutes(router.defaultPath);
  }, [router, pathname]);

  const state = useMemo<RouterState>(() => ({ location: { pathname } }), [pathname]);

  const navigate = React.useCallback(
    (options: RouterNavigateOptions) => {
      setPathname(normalizePath(options.to));
    },
    [],
  );

  const contextValue = useMemo<RouterContextValue>(
    () => ({
      state,
      matches,
      navigate,
    }),
    [state, matches, navigate],
  );

  const element = useMemo(() => buildElementFromMatches(matches), [matches]);

  return (
    <RouterContext.Provider value={contextValue}>{element}</RouterContext.Provider>
  );
}

function useRouterContext(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useRouterContext must be used within a RouterProvider");
  }
  return ctx;
}

export function Outlet(): React.ReactElement | null {
  const child = useContext(OutletContext);
  if (!child) {
    return null;
  }
  return <>{child}</>;
}

export function useNavigate(): (options: RouterNavigateOptions) => void {
  const { navigate } = useRouterContext();
  return navigate;
}

export function useRouterState<TSelected = RouterState>({
  select,
}: {
  select?: (state: RouterState) => TSelected;
} = {}): TSelected {
  const { state } = useRouterContext();
  return select ? select(state) : ((state as unknown) as TSelected);
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Register {}
