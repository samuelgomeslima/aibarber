import React from "react";

import { RouterProvider, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import TanstackNavigationLayout from "../../app/routes/TanstackNavigationLayout";
import LegacyDashboardRoute from "../../app/routes/LegacyDashboardRoute";
import BarbershopOnlineProductsRoute from "../../app/routes/BarbershopOnlineProductsRoute";
import BarbershopNewsRoute from "../../app/routes/BarbershopNewsRoute";

const rootRoute = createRootRoute({
  component: TanstackNavigationLayout,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LegacyDashboardRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "online-products",
  component: BarbershopOnlineProductsRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "news",
  component: BarbershopNewsRoute,
});

const router = createRouter({ routeTree: rootRoute, defaultPath: "/" });

export function TanstackAppRouterProvider(): React.ReactElement {
  return <RouterProvider router={router} />;
}

export { router };

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
