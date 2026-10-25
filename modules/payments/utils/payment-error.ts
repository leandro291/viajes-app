export type PaymentAmountErrorCode =
  | "invalid_pax"
  | "package_not_found"
  | "offer_invalid"
  | "invalid_exchange_rate";

// Error tipado del cálculo de monto: el llamador decide por `code`, no por el mensaje.
export class PaymentAmountError extends Error {
  readonly code: PaymentAmountErrorCode;

  constructor(code: PaymentAmountErrorCode, message?: string) {
    super(message ?? code);
    this.name = "PaymentAmountError";
    this.code = code;
  }
}
