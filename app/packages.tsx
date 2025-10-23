import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "../src/app/screens/cash-register";
import { bookingsRenderer } from "../src/app/screens/bookings";
import { productsRenderer } from "./products";
import { servicesRenderer } from "./services";

export default function Packages(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="packages"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
