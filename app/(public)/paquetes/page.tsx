import { PackagesListing } from "@/modules/packages";

export const metadata = { title: "Paquetes" };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PackagesListing searchParams={searchParams} />;
}
