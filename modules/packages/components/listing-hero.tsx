import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

// Miga + h1 + subtítulo (únicos del hero). `className` lo usa el carrusel para el solape.
export function HeroIntro({
  crumb,
  title,
  subtitle,
  className,
}: {
  crumb: string;
  title: ReactNode;
  subtitle: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <nav aria-label="Migas de pan" className="text-sm text-white/85">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/"
              className="-mx-1.5 -my-3 inline-flex items-center px-1.5 py-3 hover:text-accent-soft"
            >
              Inicio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-bold text-white">
            {crumb}
          </li>
        </ol>
      </nav>
      <h1 className="text-balance">{title}</h1>
      <p className="max-w-[560px] text-[clamp(17px,1.6vw,20px)] leading-normal text-white/90">
        {subtitle}
      </p>
    </div>
  );
}

// Tarjeta de vidrio del slide: miniatura + eyebrow + título + flecha.
export function HeroFeatureLink({
  href,
  imageUrl,
  eyebrow,
  title,
}: {
  href: string;
  imageUrl: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="mt-2 flex min-h-11 items-center gap-3.5 self-start rounded-[20px] border border-white/28 bg-[rgba(8,14,13,.42)] py-2.5 pr-5 pl-2.5 text-white backdrop-blur-[10px] transition-colors hover:bg-[rgba(8,14,13,.62)] motion-safe:animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_both]"
    >
      <span
        aria-hidden="true"
        className="relative block h-14 w-[72px] shrink-0 overflow-hidden rounded-xl bg-sand"
      >
        <Image src={imageUrl} alt="" fill sizes="72px" className="object-cover" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-bold tracking-[0.08em] text-white/80 uppercase">
          {eyebrow}
        </span>
        <span className="font-display text-[19px] font-bold">{title}</span>
      </span>
      <ArrowRight aria-hidden className="size-[18px] shrink-0" strokeWidth={2.4} />
    </Link>
  );
}
