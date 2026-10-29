import { MyBookingsPage } from "@/modules/bookings";

export const metadata = { title: "Mis reservas", robots: { index: false } };

export default function Page() {
  return <MyBookingsPage />;
}
