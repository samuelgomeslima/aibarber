import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function Index(): React.ReactElement {
  return <AuthenticatedApp initialScreen="home" />;
}
