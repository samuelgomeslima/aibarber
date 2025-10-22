import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function Products(): React.ReactElement {
  return <AuthenticatedApp initialScreen="products" />;
}
