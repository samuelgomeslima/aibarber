import React from "react";

import AuthenticatedApp from "../AuthenticatedApp";
import { bookingsRenderer } from "../../../app/bookings";
import { cashRegisterRenderer } from "../../../app/cash-register";
import { productsRenderer } from "../../../app/products";
import { servicesRenderer } from "../../../app/services";

export function LegacyDashboardRoute(): React.ReactElement {
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

export default LegacyDashboardRoute;
