import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { cashRegisterRenderer } from "./cash-register";
import { bookingsRenderer } from "./bookings";

export default function BookService(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="bookService"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
    />
  );
}
