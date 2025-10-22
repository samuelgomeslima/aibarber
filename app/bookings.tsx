import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function Bookings(): React.ReactElement {
  return <AuthenticatedApp initialScreen="bookings" />;
}
