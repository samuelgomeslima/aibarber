import React from "react";

import { RouterProvider, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

import TanstackNavigationLayout from "../../app/routes/TanstackNavigationLayout";
import OverviewRoute from "../../app/routes/OverviewRoute";
import BookingsRoute from "../../app/routes/BookingsRoute";
import ServicesRoute from "../../app/routes/ServicesRoute";
import PackagesRoute from "../../app/routes/PackagesRoute";
import ProductsRoute from "../../app/routes/ProductsRoute";
import CashRegisterRoute from "../../app/routes/CashRegisterRoute";
import AssistantRoute from "../../app/routes/AssistantRoute";
import TercosRoute from "../../app/routes/TercosRoute";
import SupportRoute from "../../app/routes/SupportRoute";
import TeamMembersRoute from "../../app/routes/TeamMembersRoute";
import SettingsRoute from "../../app/routes/SettingsRoute";
import BarbershopOnlineProductsRoute from "../../app/routes/BarbershopOnlineProductsRoute";
import BarbershopNewsRoute from "../../app/routes/BarbershopNewsRoute";

const rootRoute = createRootRoute({
  component: TanstackNavigationLayout,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: OverviewRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "bookings",
  component: BookingsRoute,
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

createRoute({
  getParentRoute: () => rootRoute,
  path: "services",
  component: ServicesRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "packages",
  component: PackagesRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "products",
  component: ProductsRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "cash-register",
  component: CashRegisterRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "assistant",
  component: AssistantRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "rosaries",
  component: TercosRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "support",
  component: SupportRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "team",
  component: TeamMembersRoute,
});

createRoute({
  getParentRoute: () => rootRoute,
  path: "settings",
  component: SettingsRoute,
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
