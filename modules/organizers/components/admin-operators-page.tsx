import { requireRole } from "@/lib/auth/require-role";

import { listOperators } from "../services/operator-service";
import { OperatorRow } from "./operator-row";

export async function AdminOperatorsPage() {
  await requireRole("admin");
  const items = await listOperators();

  return (
    <section aria-labelledby="operators-title" className="rounded-card bg-surface p-6 shadow-card md:p-8">
      <h2 id="operators-title" className="text-lg font-bold text-ink">
        Operadores
      </h2>
      {items.length === 0 ? (
        <p className="mt-6 text-ink-muted">Aún no hay operadores</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {items.map((item) => (
            <OperatorRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
