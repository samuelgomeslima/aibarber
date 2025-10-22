import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function Team(): React.ReactElement {
  return <AuthenticatedApp initialScreen="team" />;
}
