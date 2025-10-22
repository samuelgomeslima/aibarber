declare module "expo-router" {
  import * as React from "react";

  export const Slot: React.ComponentType<{ children?: React.ReactNode }>;
  export const Redirect: React.ComponentType<{ href: string }>;
  export function useRouter(): {
    replace: (href: string) => void;
    push: (href: string) => void;
    back: () => void;
  };
  export function useLocalSearchParams<T extends Record<string, string | string[] | undefined>>(): T;
}
