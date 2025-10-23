import React, { useMemo } from "react";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";

import AuthenticatedApp, {
  type ScreenName,
} from "../../src/app/AuthenticatedApp";
import { bookingsRenderer } from "../../src/app/screens/bookings";
import { cashRegisterRenderer } from "../../src/app/screens/cash-register";
import { productsRenderer } from "../products";
import { servicesRenderer } from "../services";

const SCREEN_TO_PATH: Partial<Record<ScreenName, string>> = {
  home: "/",
  bookings: "/bookings",
  bookService: "/book-service",
  services: "/services",
  packages: "/packages",
  products: "/products",
  cashRegister: "/cash-register",
  assistant: "/assistant",
  support: "/support",
  team: "/team",
  settings: "/settings",
  barbershopSettings: "/barbershop-settings",
};

const PARAM_TO_SCREEN: Record<string, ScreenName> = {
  bookings: "bookings",
  "cash-register": "cashRegister",
};

export default function HiddenTabsRoute(): React.ReactElement {
  const { screen } = useLocalSearchParams<{ screen?: string | string[] }>();
  const router = useRouter();
  const pathname = usePathname();

  const activeScreen = useMemo<ScreenName>(() => {
    const value = Array.isArray(screen) ? screen[0] : screen;
    if (value && value in PARAM_TO_SCREEN) {
      return PARAM_TO_SCREEN[value];
    }
    return "bookings";
  }, [screen]);

  return (
    <AuthenticatedApp
      initialScreen={activeScreen}
      activeScreenOverride={activeScreen}
      onNavigate={(next) => {
        const targetPath = SCREEN_TO_PATH[next];
        if (!targetPath || targetPath === pathname) {
          return;
        }
        router.replace(targetPath);
      }}
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
