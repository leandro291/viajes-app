import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthError, requireRole } from "@/lib/auth/require-role";
import { buildCheckoutHref } from "@/modules/packages";
import { getUserByClerkId } from "@/modules/users";

import { getCheckoutQuote } from "../services/checkout-service";
import { parseCheckoutParams } from "../utils/checkout-params";
import { checkoutErrorMessage, describeAmount } from "../utils/checkout-labels";
import { CheckoutForm, CheckoutSubmitButton } from "./checkout-form";
import { CheckoutNotice } from "./checkout-notice";
import { CheckoutSkeleton } from "./checkout-skeleton";
import { CheckoutSteps } from "./checkout-steps";
import { CheckoutSummary } from "./checkout-summary";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PACKAGES_HREF = "/paquetes";

export function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  // Shell estático (pasos + título); sesión y searchParams son de runtime, dentro de Suspense (D14).
  return (
    <div className="flex flex-col gap-8 py-10">
      <CheckoutSteps />
      <h1 className="font-display text-[clamp(36px,5vw,58px)] font-extrabold leading-none tracking-[-0.03em]">
        Ya casi es tuyo.
      </h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CheckoutContent({ searchParams }: { searchParams: SearchParams }) {
  const { salida, viajeros, oferta } = parseCheckoutParams(await searchParams);

  // El proxy ya protege /pago; esto cubre el caso igualmente. redirect() fuera del try.
  let userId: string | null = null;
  let forbidden = false;
  try {
    userId = (await requireRole("customer")).userId;
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    forbidden = error.code === "FORBIDDEN";
  }
  if (forbidden) redirect("/");
  if (!userId) {
    const back = salida && viajeros ? buildCheckoutHref(salida, viajeros, oferta) : "/pago";
    redirect(`/sign-in?redirect_url=${encodeURIComponent(back)}`);
  }

  if (!salida || !viajeros) {
    return (
      <CheckoutNotice
        title="Este enlace de reserva no es válido"
        message={checkoutErrorMessage("invalid_link")}
        action={{ label: "Ver paquetes", href: PACKAGES_HREF }}
      />
    );
  }

  const user = await getUserByClerkId(userId);
  if (!user) {
    return (
      <CheckoutNotice
        title="Estamos preparando tu perfil"
        message={checkoutErrorMessage("profile_missing")}
        action={{ label: "Reintentar", href: buildCheckoutHref(salida, viajeros, oferta) }}
      />
    );
  }

  const result = await getCheckoutQuote({ departureId: salida, pax: viajeros, offerId: oferta });
  if (!result.ok) {
    if (result.code === "insufficient_seats") {
      return (
        <CheckoutNotice
          title="No hay cupos suficientes"
          message={checkoutErrorMessage(result.code, { seatsLeft: result.seatsLeft })}
          action={{ label: "Ver el paquete", href: `${PACKAGES_HREF}/${result.packageSlug}` }}
        />
      );
    }
    const unavailable = result.code === "departure_unavailable";
    return (
      <CheckoutNotice
        title={unavailable ? "Esta salida ya no está disponible" : "No pudimos iniciar el pago"}
        message={checkoutErrorMessage(result.code)}
        action={{ label: "Ver paquetes", href: PACKAGES_HREF }}
      />
    );
  }

  const { quote } = result;
  const withoutOfferHref = buildCheckoutHref(salida, viajeros);
  const backHref = `${PACKAGES_HREF}/${quote.package.slug}`;

  return (
    <>
      {quote.offerExpired && (
        <Alert>
          <AlertTitle>{checkoutErrorMessage("offer_invalid")}</AlertTitle>
          <AlertDescription>
            Te mostramos el precio sin oferta.{" "}
            <Link href={withoutOfferHref} className="font-bold">
              Continuar sin oferta
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {quote.belowMinimum && (
        <Alert variant="destructive">
          <AlertDescription>{checkoutErrorMessage("below_minimum")}</AlertDescription>
        </Alert>
      )}
      <CheckoutForm
        salida={salida}
        viajeros={viajeros}
        oferta={quote.offerExpired ? undefined : oferta}
        email={user.email}
        disabled={quote.belowMinimum}
        continueWithoutOfferHref={withoutOfferHref}
        summary={
          <CheckoutSummary quote={quote} backHref={backHref}>
            <CheckoutSubmitButton disabled={quote.belowMinimum}>
              Pagar {describeAmount(quote.amount, quote.pax).charge}
            </CheckoutSubmitButton>
          </CheckoutSummary>
        }
      />
    </>
  );
}
