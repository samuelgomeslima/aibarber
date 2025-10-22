import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function Services(): React.ReactElement {
  return <AuthenticatedApp initialScreen="services" />;
}
