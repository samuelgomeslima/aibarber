import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";

export default function Bookings(): React.ReactElement {
  return <AuthenticatedApp initialScreen="bookings" renderCashRegister={cashRegisterRenderer} />;
}
