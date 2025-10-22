import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";

export default function BarbershopSettings(): React.ReactElement {
  return <AuthenticatedApp initialScreen="barbershopSettings" renderCashRegister={cashRegisterRenderer} />;
}
