import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "../src/app/screens/cash-register";
import { bookingsRenderer } from "../src/app/screens/bookings";
import { productsRenderer } from "./products";
import { servicesRenderer } from "./services";

export default function Team(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="team"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
