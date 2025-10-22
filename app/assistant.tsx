import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function Assistant(): React.ReactElement {
  return <AuthenticatedApp initialScreen="assistant" />;
}
