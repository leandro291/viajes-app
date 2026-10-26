import { ToursListing } from "@/modules/packages";

export const metadata = { title: "Tours de un día" };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ToursListing searchParams={searchParams} />;
}
