import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";

export default function Settings(): React.ReactElement {
  return <AuthenticatedApp initialScreen="settings" renderCashRegister={cashRegisterRenderer} />;
}
