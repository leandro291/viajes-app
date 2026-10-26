"use server";

import { redirect } from "next/navigation";

import { AuthError, requireRole } from "@/lib/auth/require-role";

import { parseCheckoutForm } from "../schemas/checkout-schema";
import { createCheckout } from "../services/checkout-service";
import type {
  CheckoutErrorCode,
  CheckoutFormState,
} from "../types/checkout";
import { checkoutErrorMessage } from "../utils/checkout-labels";

const TEXT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "docType",
  "docNumber",
] as const;

const fail = (
  code: CheckoutErrorCode,
  extra?: Partial<Extract<CheckoutFormState, { status: "error" }>> & {
    seatsLeft?: number;
  },
): CheckoutFormState => {
  const { seatsLeft, ...rest } = extra ?? {};
  return {
    status: "error",
    code,
    message: checkoutErrorMessage(code, { seatsLeft }),
    ...rest,
  };
};

export async function startCheckout(
  _prev: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  // redirect() lanza NEXT_REDIRECT: se llama fuera del try/catch.
  let url: string;
  try {
    const { userId } = await requireRole("customer");

    const parsed = parseCheckoutForm(formData);
    if (!parsed.ok) {
      if (parsed.linkInvalid) return fail("invalid_link");
      const values: Record<string, string> = {};
      for (const f of TEXT_FIELDS) {
        const v = formData.get(f);
        if (typeof v === "string") values[f] = v;
      }
      return fail("invalid_input", { fieldErrors: parsed.fieldErrors, values });
    }

    const result = await createCheckout({
      clerkUserId: userId,
      data: parsed.data,
    });
    if (!result.ok) return fail(result.code, { seatsLeft: result.seatsLeft });
    url = result.url;
  } catch (e) {
    if (e instanceof AuthError) return fail("unauthenticated");
    // Sin detalles ni datos del viajero en logs.
    console.error("startCheckout: fallo inesperado");
    return fail("unexpected");
  }

  redirect(url);
}
