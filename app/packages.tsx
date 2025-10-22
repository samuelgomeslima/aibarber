import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function Packages(): React.ReactElement {
  return <AuthenticatedApp initialScreen="packages" />;
}
