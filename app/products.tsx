import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";

export default function Products(): React.ReactElement {
  return <AuthenticatedApp initialScreen="products" renderCashRegister={cashRegisterRenderer} />;
}
