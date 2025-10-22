import React from "react";

import { AuthGate } from "./src/components/AuthGate";
import AuthenticatedApp from "./src/app/AuthenticatedApp";

export default function App() {
  return (
    <AuthGate>
      <AuthenticatedApp />
    </AuthGate>
  );
}
