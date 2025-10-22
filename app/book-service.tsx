import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";

export default function BookService(): React.ReactElement {
  return <AuthenticatedApp initialScreen="bookService" renderCashRegister={cashRegisterRenderer} />;
}
