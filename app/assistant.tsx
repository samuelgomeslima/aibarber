import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";
import { bookingsRenderer } from "./bookings";

export default function Assistant(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="assistant"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
    />
  );
}
