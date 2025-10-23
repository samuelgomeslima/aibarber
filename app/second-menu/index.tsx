import React from "react";
import { Redirect } from "expo-router";

export default function SecondMenuIndex(): React.ReactElement {
  return <Redirect href="/second-menu/barbershop-news" />;
}
