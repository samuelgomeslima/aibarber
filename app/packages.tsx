import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";
import { bookingsRenderer } from "./bookings";

export default function Packages(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="packages"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
    />
  );
}
