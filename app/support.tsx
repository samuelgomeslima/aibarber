import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { useAuthenticatedAppNavigation } from "../src/app/navigation";
import { cashRegisterRenderer } from "./(tabs)/cash-register";
import { bookingsRenderer } from "./(tabs)/bookings";
import { productsRenderer } from "./products";
import { servicesRenderer } from "./services";

export default function Support(): React.ReactElement {
  const handleNavigate = useAuthenticatedAppNavigation();

  return (
    <AuthenticatedApp
      initialScreen="support"
      onNavigate={handleNavigate}
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
