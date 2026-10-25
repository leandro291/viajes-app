import { NewsletterSignup } from "@/modules/newsletter";
import { OffersPage } from "@/modules/offers";

export const metadata = { title: "Ofertas" };

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
