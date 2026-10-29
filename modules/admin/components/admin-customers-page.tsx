import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/require-role";
import { formatDepartureShortDate } from "@/lib/lima-date";
import { formatPen } from "@/lib/money";

import { listCustomers } from "../services/customer-list-service";

export async function AdminCustomersPage() {
  // El layout no bloquea: la guardia va aquí, antes de leer datos.
  await requireRole("admin");
  const customers = await listCustomers();

  if (customers.length === 0) {
    return (
      <section aria-labelledby="customers-none" className="rounded-card bg-surface p-6 shadow-card md:p-8">
        <h2 id="customers-none" className="text-lg font-bold text-ink">
          Aún no hay clientes
        </h2>
        <p className="mt-2 text-ink-muted">Cuando alguien se registre como cliente, aparecerá aquí.</p>
      </section>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">Clientes y sus reservas confirmadas</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Cliente</TableHead>
          <TableHead scope="col">Reservas</TableHead>
          <TableHead scope="col">Gasto total</TableHead>
          <TableHead scope="col">Última reserva</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <span className="block font-medium">{c.name ?? "Sin nombre"}</span>
              <span className="block text-muted-foreground">{c.email}</span>
            </TableCell>
            <TableCell>{c.bookingsCount}</TableCell>
            <TableCell>{formatPen(c.totalCents)}</TableCell>
            <TableCell>{c.lastBookingAt ? formatDepartureShortDate(c.lastBookingAt) : "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
