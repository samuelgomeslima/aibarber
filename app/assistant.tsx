import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";

export default function Assistant(): React.ReactElement {
  return <AuthenticatedApp initialScreen="assistant" renderCashRegister={cashRegisterRenderer} />;
}
