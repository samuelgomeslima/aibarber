import React from "react";

const wrap = (tag: string) => ({ children }: { children?: React.ReactNode }) =>
  React.createElement(tag, null, children);

export const Modal = wrap("div");
export const View = wrap("div");
export const Text = wrap("span");
export const Pressable = wrap("button");
export const ScrollView = wrap("div");
export const StyleSheet = { create: (styles: object) => styles };
