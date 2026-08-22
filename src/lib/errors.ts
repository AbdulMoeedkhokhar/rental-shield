/**
 * Supabase rejects with plain objects ({ message, details, hint, code }), not
 * Error instances, so `String(e)` yields "[object Object]" and throws away the
 * only useful information. Everything that surfaces an error to a user or a
 * log should go through this.
 */
export function toMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;

  if (e && typeof e === "object") {
    const err = e as Record<string, unknown>;
    const parts = [err.message, err.details, err.hint].filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );
    if (parts.length > 0) {
      const code = typeof err.code === "string" ? ` [${err.code}]` : "";
      return parts.join(" — ") + code;
    }
    try {
      return JSON.stringify(e);
    } catch {
      // Circular or otherwise unserialisable; fall through.
    }
  }

  return String(e);
}
