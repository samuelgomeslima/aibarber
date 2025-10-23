import React from "react";

import { TanstackAppRouterProvider } from "../src/router/tanstack/router";

export default function Index(): React.ReactElement {
  return <TanstackAppRouterProvider />;
}
