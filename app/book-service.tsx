import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./(tabs)/cash-register";
import { bookingsRenderer } from "./(tabs)/bookings";
import { productsRenderer } from "./products";
import { servicesRenderer } from "./services";

export default function BookService(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="bookService"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
