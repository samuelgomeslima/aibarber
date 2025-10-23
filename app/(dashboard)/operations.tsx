import React from "react";

import AuthenticatedApp from "../../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "../cash-register";
import { bookingsRenderer } from "../bookings";
import { productsRenderer } from "../products";
import { servicesRenderer } from "../services";

export default function OperationsWorkspace(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="home"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
