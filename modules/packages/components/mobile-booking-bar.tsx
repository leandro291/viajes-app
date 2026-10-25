import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Barra fija solo en móvil (el panel completo queda arriba, en #reserva).
export function MobileBookingBar({
  total,
  summary,
  href,
}: {
  total: string;
  summary: string;
  href: string | null;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-9 flex items-center gap-3 border-t border-border-strong bg-surface px-4 py-3 shadow-[0_-12px_30px_rgba(11,21,19,0.08)] lg:hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] text-ink-muted">{summary}</span>
        <span className="font-display text-[22px] font-extrabold">{total}</span>
      </div>
      {href ? (
        <Link href={href} className={cn(buttonVariants({ variant: "cta" }), "h-[52px]")}>
          Reservar
        </Link>
      ) : (
        <Link href="#reserva" className={cn(buttonVariants({ variant: "cta" }), "h-[52px]")}>
          Ver salidas
        </Link>
      )}
    </div>
  );
}
