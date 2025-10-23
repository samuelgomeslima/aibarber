import React from "react";
import { Redirect } from "expo-router";

export default function BarbershopOnlineProductsRedirect(): React.ReactElement {
  return <Redirect href="/(side-menu)/barbershop-online-products" />;
}
