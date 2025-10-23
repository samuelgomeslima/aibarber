import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";
import { bookingsRenderer } from "./bookings";

export default function Team(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="team"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
    />
  );
}
