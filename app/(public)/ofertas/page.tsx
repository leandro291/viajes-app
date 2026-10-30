import { buildMetadata } from "@/lib/seo/metadata";
import { NewsletterSignup } from "@/modules/newsletter";
import { OffersPage } from "@/modules/offers";

export const metadata = buildMetadata({
  title: "Ofertas",
  path: "/ofertas",
  description:
    "Aprovecha las ofertas vigentes en paquetes y tours por Perú. Descuentos por tiempo limitado de operadores locales, con reserva segura en línea.",
});

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <OffersPage searchParams={searchParams} />
      <NewsletterSignup />
    </>
  );
}
