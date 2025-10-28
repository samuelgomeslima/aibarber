export const queryKeys = {
  products: ["products"] as const,
};

export type QueryKeyName = keyof typeof queryKeys;

