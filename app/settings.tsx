import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function Settings(): React.ReactElement {
  return <AuthenticatedApp initialScreen="settings" />;
}
