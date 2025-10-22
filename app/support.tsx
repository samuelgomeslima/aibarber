import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";

export default function Support(): React.ReactElement {
  return <AuthenticatedApp initialScreen="support" renderCashRegister={cashRegisterRenderer} />;
}
