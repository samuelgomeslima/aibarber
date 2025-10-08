export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const CONSOLE_METHOD: Record<LogLevel, (message?: any, ...optionalParams: any[]) => void> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function resolveConfiguredLevel(): LogLevel {
  const envLevel = (process.env.LOG_LEVEL ?? "").toLowerCase();
  if (envLevel in LEVEL_WEIGHT) return envLevel as LogLevel;
  return process.env.NODE_ENV === "production" ? "warn" : "debug";
}

const configuredLevel = resolveConfiguredLevel();

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return `[array(${value.length})]`;
  if (typeof value === "object") return "[object]";
  return value;
}

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  return Object.entries(context).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key] = sanitizeValue(value);
    return acc;
  }, {});
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[configuredLevel];
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const method = CONSOLE_METHOD[level] ?? console.log.bind(console);
  const safeContext = sanitizeContext(context);
  if (safeContext && Object.keys(safeContext).length > 0) {
    method(`[${level.toUpperCase()}] ${message}`, safeContext);
  } else {
    method(`[${level.toUpperCase()}] ${message}`);
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),
};
