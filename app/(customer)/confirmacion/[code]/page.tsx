import { ConfirmationPage } from "@/modules/checkout";

export const metadata = { title: "Reserva confirmada", robots: { index: false } };

export default function Page({ params }: { params: Promise<{ code: string }> }) {
  return <ConfirmationPage params={params} />;
}
