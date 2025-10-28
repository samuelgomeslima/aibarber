import React, { useContext, useEffect, useMemo, useReducer } from "react";

export type QueryKey = readonly unknown[];

export type QueryFunction<TData> = () => Promise<TData>;

type QueryStatus = "idle" | "pending" | "success" | "error";
type FetchStatus = "idle" | "fetching" | "refetching";

type InternalQueryOptions<TData> = {
  queryFn: QueryFunction<TData>;
  staleTime: number;
  gcTime: number;
  onError?: (error: unknown) => void;
  enabled: boolean;
};

type QueryState<TData> = {
  queryKey: QueryKey;
  hash: string;
  data?: TData;
  error?: unknown;
  status: QueryStatus;
  fetchStatus: FetchStatus;
  updatedAt: number;
  promise: Promise<TData> | null;
  listeners: Set<() => void>;
  options?: InternalQueryOptions<TData>;
  invalidated: boolean;
  gcTimeout: ReturnType<typeof setTimeout> | null;
};

type QueryClientConfig = {
  defaultOptions?: {
    queries?: {
      staleTime?: number;
      gcTime?: number;
    };
  };
};

export type UseQueryOptions<TData> = {
  queryKey: QueryKey;
  queryFn: QueryFunction<TData>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  onError?: (error: unknown) => void;
};

export type UseQueryResult<TData> = {
  data: TData | undefined;
  error: unknown;
  status: QueryStatus;
  isPending: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  refetch: () => Promise<TData | undefined>;
};

function hashQueryKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey);
}

function now(): number {
  return Date.now();
}

const DEFAULT_GC_TIME = 5 * 60 * 1000;

export class QueryClient {
  private readonly queries = new Map<string, QueryState<any>>();

  private readonly defaultStaleTime: number;

  private readonly defaultGcTime: number;

  constructor(config: QueryClientConfig = {}) {
    this.defaultStaleTime = config.defaultOptions?.queries?.staleTime ?? 0;
    this.defaultGcTime = config.defaultOptions?.queries?.gcTime ?? DEFAULT_GC_TIME;
  }

  private ensureState<TData>(queryKey: QueryKey): QueryState<TData> {
    const hash = hashQueryKey(queryKey);
    const existing = this.queries.get(hash) as QueryState<TData> | undefined;
    if (existing) {
      return existing;
    }

    const state: QueryState<TData> = {
      queryKey,
      hash,
      data: undefined,
      error: undefined,
      status: "idle",
      fetchStatus: "idle",
      updatedAt: 0,
      promise: null,
      listeners: new Set(),
      options: undefined,
      invalidated: false,
      gcTimeout: null,
    };

    this.queries.set(hash, state as QueryState<any>);
    return state;
  }

  private resolveOptions<TData>(options: UseQueryOptions<TData>): InternalQueryOptions<TData> {
    return {
      queryFn: options.queryFn,
      staleTime: options.staleTime ?? this.defaultStaleTime,
      gcTime: options.gcTime ?? this.defaultGcTime,
      onError: options.onError,
      enabled: options.enabled ?? true,
    };
  }

  private notify(state: QueryState<any>) {
    state.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error("Query listener failed", error);
      }
    });
  }

  private clearGcTimer(state: QueryState<any>) {
    if (state.gcTimeout) {
      clearTimeout(state.gcTimeout);
      state.gcTimeout = null;
    }
  }

  private scheduleGc(state: QueryState<any>) {
    this.clearGcTimer(state);
    const gcTime = state.options?.gcTime ?? this.defaultGcTime;
    if (!Number.isFinite(gcTime) || gcTime <= 0) {
      return;
    }

    state.gcTimeout = setTimeout(() => {
      this.removeQuery(state.hash);
    }, gcTime);
  }

  private removeQuery(hash: string) {
    const state = this.queries.get(hash);
    if (!state) return;
    this.clearGcTimer(state);
    this.queries.delete(hash);
  }

  private shouldFetch(state: QueryState<any>, force: boolean): boolean {
    if (!state.options) {
      return false;
    }

    if (!force && state.options.enabled === false) {
      return false;
    }

    if (state.promise) {
      return false;
    }

    if (force) {
      return true;
    }

    if (state.status !== "success") {
      return true;
    }

    if (state.invalidated) {
      return true;
    }

    const age = now() - state.updatedAt;
    return age >= (state.options?.staleTime ?? this.defaultStaleTime);
  }

  private fetch(state: QueryState<any>, force: boolean): Promise<any> | undefined {
    if (!state.options) {
      return undefined;
    }

    if (!this.shouldFetch(state, force)) {
      return state.promise ?? undefined;
    }

    state.invalidated = false;
    const previousStatus = state.status;
    state.fetchStatus = previousStatus === "success" ? "refetching" : "fetching";
    if (previousStatus !== "success") {
      state.status = "pending";
    }
    this.notify(state);

    const promise = state.options
      .queryFn()
      .then((data) => {
        state.data = data;
        state.error = undefined;
        state.status = "success";
        state.fetchStatus = "idle";
        state.updatedAt = now();
        state.promise = null;
        this.clearGcTimer(state);
        this.notify(state);
        return data;
      })
      .catch((error) => {
        state.error = error;
        state.status = "error";
        state.fetchStatus = "idle";
        state.updatedAt = now();
        state.promise = null;
        this.notify(state);
        state.options?.onError?.(error);
        throw error;
      });

    state.promise = promise;
    return promise;
  }

  public setQueryOptions<TData>(queryKey: QueryKey, options: UseQueryOptions<TData>): void {
    const state = this.ensureState<TData>(queryKey);
    state.options = this.resolveOptions(options);
    if (state.listeners.size > 0) {
      this.clearGcTimer(state);
    }
  }

  public getQueryState<TData>(queryKey: QueryKey): QueryState<TData> | undefined {
    const hash = hashQueryKey(queryKey);
    return this.queries.get(hash) as QueryState<TData> | undefined;
  }

  public getQueryData<TData>(queryKey: QueryKey): TData | undefined {
    return this.getQueryState<TData>(queryKey)?.data;
  }

  public setQueryData<TData>(
    queryKey: QueryKey,
    updater: TData | ((current: TData | undefined) => TData),
  ): TData {
    const state = this.ensureState<TData>(queryKey);
    const nextValue =
      typeof updater === "function" ? (updater as (value: TData | undefined) => TData)(state.data) : updater;

    state.data = nextValue;
    state.error = undefined;
    state.status = "success";
    state.fetchStatus = "idle";
    state.updatedAt = now();
    state.invalidated = false;
    this.clearGcTimer(state);
    this.notify(state);
    return nextValue;
  }

  public subscribe(queryKey: QueryKey, listener: () => void): () => void {
    const state = this.ensureState(queryKey);
    state.listeners.add(listener);
    this.clearGcTimer(state);

    return () => {
      state.listeners.delete(listener);
      if (state.listeners.size === 0) {
        this.scheduleGc(state);
      }
    };
  }

  public fetchIfStale(queryKey: QueryKey): Promise<any> | undefined {
    const state = this.ensureState(queryKey);
    return this.fetch(state, false);
  }

  public forceFetch(queryKey: QueryKey): Promise<any> | undefined {
    const state = this.ensureState(queryKey);
    return this.fetch(state, true);
  }

  public async invalidateQueries({ queryKey }: { queryKey: QueryKey }): Promise<void> {
    const state = this.ensureState(queryKey);
    state.invalidated = true;
    if (state.listeners.size === 0) {
      return;
    }
    await this.fetch(state, false)?.catch(() => undefined);
  }

  public clear(): void {
    this.queries.forEach((state) => {
      this.clearGcTimer(state);
    });
    this.queries.clear();
  }
}

const QueryClientContext = React.createContext<QueryClient | null>(null);

type QueryClientProviderProps = {
  client: QueryClient;
  children: React.ReactNode;
};

export function QueryClientProvider({ client, children }: QueryClientProviderProps): React.ReactElement {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
}

export function useQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error("No QueryClient has been provided. Wrap your app in a QueryClientProvider.");
  }
  return client;
}

export function useQuery<TData>(options: UseQueryOptions<TData>): UseQueryResult<TData> {
  const client = useQueryClient();
  const { queryKey, queryFn, staleTime, gcTime, enabled, onError } = options;
  const keyHash = useMemo(() => hashQueryKey(queryKey), [queryKey]);

  client.setQueryOptions(queryKey, { queryKey, queryFn, staleTime, gcTime, enabled, onError });

  const [, forceRender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => client.subscribe(queryKey, forceRender), [client, keyHash]);

  useEffect(() => {
    if (enabled === false) return;
    client.fetchIfStale(queryKey);
  }, [client, keyHash, enabled, queryFn, staleTime, gcTime, onError]);

  const state = client.getQueryState<TData>(queryKey);

  const data = state?.data as TData | undefined;
  const error = state?.error;
  const status = state?.status ?? "idle";
  const fetchStatus = state?.fetchStatus ?? "idle";
  const isPending = (status === "idle" || status === "pending") && data === undefined;
  const isFetching = fetchStatus === "fetching" || fetchStatus === "refetching";
  const isRefetching = fetchStatus === "refetching";

  const refetch = React.useCallback(async () => {
    const promise = client.forceFetch(queryKey);
    if (!promise) {
      return data;
    }
    try {
      return (await promise) as TData;
    } catch (err) {
      return undefined;
    }
  }, [client, keyHash, data]);

  return useMemo(
    () => ({
      data,
      error,
      status,
      isPending,
      isFetching,
      isRefetching,
      refetch,
    }),
    [data, error, status, isPending, isFetching, isRefetching, refetch],
  );
}

