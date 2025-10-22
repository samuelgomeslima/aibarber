import React from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";

import AuthenticatedApp, { SCREEN_ROUTES, type ScreenName } from "../src/app/AuthenticatedApp";

const SCREEN_SET = new Set<ScreenName>(SCREEN_ROUTES);
const DEFAULT_SCREEN: ScreenName = SCREEN_ROUTES[0];

const isScreenName = (value: string | null | undefined): value is ScreenName =>
  typeof value === "string" && SCREEN_SET.has(value as ScreenName);

export default function ScreenRoute() {
  const params = useLocalSearchParams<{ screen?: string | string[] }>();
  const router = useRouter();
  const rawScreen = params.screen;
  const screenParam = Array.isArray(rawScreen) ? rawScreen[0] : rawScreen;

  if (!isScreenName(screenParam)) {
    return <Redirect href={`/${DEFAULT_SCREEN}`} />;
  }

  return (
    <AuthenticatedApp
      routeScreen={screenParam}
      onNavigate={(next) => {
        if (next !== screenParam) {
          router.replace(`/${next}`);
        }
      }}
    />
  );
}
