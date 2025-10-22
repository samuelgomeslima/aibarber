import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function CashRegister(): React.ReactElement {
  return <AuthenticatedApp initialScreen="cashRegister" />;
}
