import { CheckoutPage } from "@/modules/checkout";

export const metadata = { title: "Pago", robots: { index: false } };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CheckoutPage searchParams={searchParams} />;
}
