type KpiCardProps = {
  label: string;
  // Ya formateado (formatPen, "—", "8.3 %"): la tarjeta no calcula nada.
  value: string;
  hint?: string;
};

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <dl className="min-w-0 rounded-card bg-surface p-6 shadow-card">
      <dt className="text-sm font-bold text-ink-muted">{label}</dt>
      <dd className="mt-2 break-words text-[34px] leading-none font-extrabold tracking-[-0.03em] text-ink">
        {value}
      </dd>
      {hint ? (
        <dd className="mt-2 text-sm text-ink-muted">{hint}</dd>
      ) : null}
    </dl>
  );
}
