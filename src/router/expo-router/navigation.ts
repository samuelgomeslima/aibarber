import React from "react";

type NavigationContextValue = {
  pathname: string;
  navigate: (href: string) => void;
};

const NavigationContext = React.createContext<NavigationContextValue | undefined>(
  undefined,
);

export type NavigationProviderProps = {
  value: NavigationContextValue;
  children: React.ReactNode;
};

export function NavigationProvider({ value, children }: NavigationProviderProps) {
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigationContext(): NavigationContextValue {
  const context = React.useContext(NavigationContext);

  if (!context) {
    throw new Error("useNavigationContext must be used within a NavigationProvider");
  }

  return context;
}

export function normalizeHref(href: string): string {
  if (!href) {
    return "/";
  }

  const trimmed = href.trim();
  if (!trimmed.startsWith("/")) {
    return `/${trimmed}`;
  }

  return trimmed === "/" ? trimmed : trimmed.replace(/\/+$/, "");
}
