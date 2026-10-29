export type CancelErrorCode =
  | "not_found"
  | "not_cancellable"
  | "too_late"
  | "no_refundable_payment"
  | "refund_failed";

export type CancelResult =
  | { ok: true; alreadyCancelled: boolean; refundedUsdCents: number } // 0 si alreadyCancelled
  | { ok: false; code: CancelErrorCode };
