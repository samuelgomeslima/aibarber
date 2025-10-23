import React from "react";
import { Redirect } from "expo-router";

export default function Index(): React.ReactElement {
  return <Redirect href="/overview" />;
}
