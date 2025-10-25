import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";
import { LanguageProvider } from "../src/contexts/LanguageContext";
import { cashRegisterRenderer } from "./cash-register";
import { bookingsRenderer } from "./bookings";
import { productsRenderer } from "./products";
import { servicesRenderer } from "./services";

export default function Settings(): React.ReactElement {
  return (
    <LanguageProvider>
      <AuthenticatedApp
        initialScreen="settings"
        renderBookings={bookingsRenderer}
        renderCashRegister={cashRegisterRenderer}
        renderProducts={productsRenderer}
        renderServices={servicesRenderer}
      />
    </LanguageProvider>
  );
}
