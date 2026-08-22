/**
 * Free-tier caps. Because the free plan limits creation and not just export,
 * these are enforced in the data layer at write time — never in a screen, or
 * every new creation path becomes a bypass.
 */
export const FREE_LIMITS = {
  properties: 1,
  photos: 15,
} as const;

export type QuotaKind = keyof typeof FREE_LIMITS;

export class QuotaExceededError extends Error {
  constructor(
    readonly kind: QuotaKind,
    readonly limit: number
  ) {
    super(
      kind === "properties"
        ? `Your free plan covers ${limit} property. Upgrade to document more.`
        : `Your free plan covers ${limit} photos. Upgrade for unlimited capture.`
    );
    this.name = "QuotaExceededError";
  }
}

export function isQuotaError(e: unknown): e is QuotaExceededError {
  return e instanceof QuotaExceededError;
}
