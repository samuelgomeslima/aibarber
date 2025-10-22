import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function Support(): React.ReactElement {
  return <AuthenticatedApp initialScreen="support" />;
}
