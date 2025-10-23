import React from "react";
import { Redirect } from "expo-router";

export default function BarbershopNewsRedirect(): React.ReactElement {
  return <Redirect href="/(side-menu)/barbershop-news" />;
}
