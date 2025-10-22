import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";

export default function Packages(): React.ReactElement {
  return <AuthenticatedApp initialScreen="packages" renderCashRegister={cashRegisterRenderer} />;
}
