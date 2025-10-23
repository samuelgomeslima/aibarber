import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";
import { bookingsRenderer } from "./bookings";

export default function Support(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="support"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
    />
  );
}
