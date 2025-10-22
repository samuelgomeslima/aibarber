import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function BarbershopSettings(): React.ReactElement {
  return <AuthenticatedApp initialScreen="barbershopSettings" />;
}
