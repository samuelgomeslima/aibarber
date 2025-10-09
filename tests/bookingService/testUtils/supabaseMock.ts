import { vi } from "vitest";

export type SupabaseResponse<T = unknown> = {
  data?: T | null;
  error?: unknown;
  status?: number;
};

export class MockQueryBuilder<T = unknown> {
  private _response: SupabaseResponse<T>;

  readonly select = vi.fn(() => this);
  readonly eq = vi.fn(() => this);
  readonly gte = vi.fn(() => this);
  readonly lte = vi.fn(() => this);
  readonly in = vi.fn(() => this);
  readonly order = vi.fn(() => this);
  readonly limit = vi.fn(() => this);
  readonly insert = vi.fn(() => this);
  readonly delete = vi.fn(() => this);
  readonly or = vi.fn(() => this);

  readonly single = vi.fn(async () => this._response);
  readonly maybeSingle = vi.fn(async () => this._response);

  constructor(response: SupabaseResponse<T> = { data: null, error: null, status: 200 }) {
    this._response = response;
  }

  returns(response: SupabaseResponse<T>) {
    this._response = response;
    return this;
  }

  then<TResult1 = SupabaseResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse<T>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ) {
    return Promise.resolve(this._response).then(onfulfilled, onrejected);
  }
}

export function createSupabaseMock() {
  const tables = new Map<string, MockQueryBuilder<any> | (() => MockQueryBuilder<any>)>();
  const from = vi.fn((table: string) => {
    const handler = tables.get(table);
    if (!handler) {
      throw new Error(`No mock configured for table: ${table}`);
    }
    if (typeof handler === "function") {
      const instance = handler();
      return instance;
    }
    return handler;
  });

  const rpc = vi.fn(async () => ({ data: null, error: null, status: 200 }));

  return {
    client: { from, rpc },
    from,
    rpc,
    useTable<T>(table: string, response: SupabaseResponse<T> = { data: null, error: null, status: 200 }) {
      const builder = new MockQueryBuilder<T>(response);
      tables.set(table, builder);
      return builder;
    },
    setTable(table: string, factory: () => MockQueryBuilder<any>) {
      tables.set(table, factory);
    },
    reset() {
      tables.clear();
      from.mockClear();
      rpc.mockClear();
    },
  };
}

export const supabaseMock = createSupabaseMock();
