/**
 * Minimal structured logger. Swap the implementation for a real
 * observability service (e.g. Sentry, Axiom, Logtail) in Sprint 9 —
 * every call site here already passes structured fields, so the swap
 * is a one-file change.
 */
type LogFields = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", event: string, fields?: LogFields) {
  const line = { level, event, ts: new Date().toISOString(), ...fields };
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](JSON.stringify(line));
}

export const logger = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

/**
 * Audit-log hook for security-sensitive actions (role changes, points
 * awards, admin actions). Currently just logs; in a later sprint this
 * should also write to an `audit_log` table for a real trail.
 */
export function auditLog(action: string, fields: LogFields) {
  logger.info(`audit:${action}`, fields);
}
