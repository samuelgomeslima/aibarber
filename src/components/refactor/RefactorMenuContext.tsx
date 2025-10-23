import React from "react";

import type { ThemeColors } from "../../app/AuthenticatedApp";

export type RefactorMenuContextValue = {
  colors: ThemeColors;
  collapsed: boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  dimensions: {
    collapsed: number;
    expanded: number;
  };
};

export const RefactorMenuContext = React.createContext<RefactorMenuContextValue | undefined>(undefined);

export function useRefactorMenuContext(): RefactorMenuContextValue {
  const context = React.useContext(RefactorMenuContext);
  if (!context) {
    throw new Error("useRefactorMenuContext must be used within a RefactorMenuContext provider");
  }
  return context;
}
