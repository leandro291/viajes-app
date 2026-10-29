import { buildMetadata } from "@/lib/seo/metadata";
import { ToursListing } from "@/modules/packages";

export const metadata = buildMetadata({
  title: "Tours de un día",
  path: "/tours",
  description:
    "Descubre tours de un día por Perú con guías locales: aventura, cultura y naturaleza sin pernoctar. Compara precios y reserva tu lugar en línea.",
});

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ToursListing searchParams={searchParams} />;
}
