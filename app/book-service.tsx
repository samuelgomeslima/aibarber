import React from "react";

import AuthenticatedApp from "../src/app/AuthenticatedApp";

export default function BookService(): React.ReactElement {
  return <AuthenticatedApp initialScreen="bookService" />;
}
