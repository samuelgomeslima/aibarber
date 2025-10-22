import { Slot } from "expo-router";

import AuthenticatedApp from "../../src/app/AuthenticatedApp";

export default function AuthenticatedLayout() {
  return (
    <>
      <AuthenticatedApp />
      <Slot />
    </>
  );
}
