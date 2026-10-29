import { requireRole } from "@/lib/auth/require-role";
import { limaDayRange, limaMonthRange } from "@/lib/lima-time";
import { getBookingKpis } from "@/modules/bookings";
import { getTopDestinations } from "@/modules/destinations";
import { getTodayDepartures } from "@/modules/packages";

import { formatMoneyOrDash, formatRate } from "../utils/kpi-format";
import { KpiCard } from "./kpi-card";
import { TodayDeparturesCard } from "./today-departures-card";
import { TopDestinationsCard } from "./top-destinations-card";

export async function AdminDashboard() {
  // requireRole lee la sesión (request-time): `new Date()` va después para
  // que Cache Components no lo trate como valor de prerender.
  await requireRole("admin");
  const now = new Date();
  const month = limaMonthRange(now);
  const day = limaDayRange(now);

  const [kpis, topDestinations, today] = await Promise.all([
    getBookingKpis(month),
    getTopDestinations(month),
    getTodayDepartures(day),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[1280px]:grid-cols-4">
        <KpiCard
          label="Ingresos del mes"
          value={formatMoneyOrDash(kpis.revenueCents)}
        />
        <KpiCard
          label="Ticket promedio"
          value={formatMoneyOrDash(kpis.averageTicketCents)}
        />
        <KpiCard
          label="Cancelaciones"
          value={formatRate(kpis.cancellationRate)}
          hint={`${kpis.cancelledCount} de ${kpis.totalCount} reservas`}
        />
        <KpiCard
          label="Salidas de hoy"
          value={String(today.departuresCount)}
          hint={
            today.travelersCount === 1
              ? "1 viajero"
              : `${today.travelersCount} viajeros`
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-2">
        <TopDestinationsCard destinations={topDestinations} />
        <TodayDeparturesCard data={today} />
      </div>
    </div>
  );
}
