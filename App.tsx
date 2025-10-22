import React from "react";

import { BrowserRouter } from "./src/vendor/react-router-dom";

import { AuthGate } from "./src/components/AuthGate";
import AuthenticatedApp from "./src/app/AuthenticatedApp";

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <AuthenticatedApp />
      </AuthGate>
    </BrowserRouter>
  );
}
