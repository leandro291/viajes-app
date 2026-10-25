import { PackageDetail, generateDetailMetadata } from "@/modules/packages";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const generateMetadata = ({ params }: { params: Params }) => generateDetailMetadata(params);

export default function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return <PackageDetail params={params} searchParams={searchParams} />;
}
