import { buildMetadata } from "@/lib/seo/metadata";
import { PackagesListing } from "@/modules/packages";

export const metadata = buildMetadata({
  title: "Paquetes",
  path: "/paquetes",
  description:
    "Explora paquetes turísticos de varios días por Perú: Cusco, Arequipa, Amazonía y más. Filtra por destino, duración y precio, y reserva en línea.",
});

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <PackagesListing searchParams={searchParams} />;
}
