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
      <p className="text-xs font-bold tracking-[0.12em] text-accent-soft uppercase md:hidden">
        {crumb}
      </p>
      <nav aria-label="Migas de pan" className="text-sm text-white/85 max-md:hidden">
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
      <h1 className="text-balance max-md:text-wrap max-md:text-[40px] max-md:tracking-[-0.04em]">{title}</h1>
      <p className="max-w-[560px] text-[clamp(17px,1.6vw,20px)] leading-normal text-white/90 max-md:hidden">
        {subtitle}
      </p>
    </div>
  );
}

// Tarjeta de vidrio del slide. Móvil: sin miniatura, "Desde <precio>" en su línea y flecha en círculo.
export function HeroFeatureLink({
  href,
  imageUrl,
  eyebrow,
  title,
  price,
}: {
  href: string;
  imageUrl: string;
  eyebrow: string;
  title: string;
  price: string;
}) {
  return (
    <Link
      href={href}
      className="mt-2 flex min-h-11 items-center gap-3.5 self-start rounded-[20px] border border-white/28 bg-[rgba(8,14,13,.42)] py-2.5 pr-5 pl-2.5 text-white backdrop-blur-[10px] transition-colors hover:bg-[rgba(8,14,13,.62)] motion-safe:animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_both] max-md:w-full max-md:justify-between max-md:gap-3 max-md:self-stretch max-md:py-3 max-md:pr-3 max-md:pl-4"
    >
      <span
        aria-hidden="true"
        className="relative block h-14 w-[72px] shrink-0 overflow-hidden rounded-xl bg-sand max-md:hidden"
      >
        <Image src={imageUrl} alt="" fill sizes="72px" className="object-cover" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 max-md:flex-1">
        <span className="text-xs leading-4 font-bold tracking-[0.08em] text-white/80 uppercase max-md:tracking-normal max-md:text-accent-soft max-md:normal-case">
          {eyebrow}
        </span>
        <span className="font-display text-[19px] font-bold max-md:leading-[22px]">
          {title}
          <span className="max-md:hidden"> · desde {price}</span>
        </span>
        <span className="text-sm leading-[18px] md:hidden">
          Desde <b>{price}</b>
        </span>
      </span>
      <span className="grid shrink-0 place-items-center max-md:size-11 max-md:rounded-full max-md:bg-accent">
        <ArrowRight aria-hidden className="size-[18px]" strokeWidth={2.4} />
      </span>
    </Link>
  );
}
