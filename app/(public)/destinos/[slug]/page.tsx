import { DestinationPage, generateDestinationMetadata } from "@/modules/destinations";

type Params = Promise<{ slug: string }>;

export const generateMetadata = ({ params }: { params: Params }) =>
  generateDestinationMetadata(params);

export default function Page({ params }: { params: Params }) {
  return <DestinationPage params={params} />;
}
