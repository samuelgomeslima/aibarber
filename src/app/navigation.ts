import { useCallback } from "react";
import { usePathname, useRouter } from "expo-router";

import type { ScreenName } from "./AuthenticatedApp";

const SCREEN_TO_PATH: Record<ScreenName, string> = {
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

export function useAuthenticatedAppNavigation(): (screen: ScreenName) => void {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (screen: ScreenName) => {
      const targetPath = SCREEN_TO_PATH[screen];
      if (!targetPath || targetPath === pathname) {
        return;
      }

      router.replace(targetPath);
    },
    [pathname, router],
  );
}

export { SCREEN_TO_PATH };
