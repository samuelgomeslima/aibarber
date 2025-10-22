import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";

export default function Team(): React.ReactElement {
  return <AuthenticatedApp initialScreen="team" renderCashRegister={cashRegisterRenderer} />;
}
