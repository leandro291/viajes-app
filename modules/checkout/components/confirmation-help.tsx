import Image from "next/image";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

// Patrón de home/whatsapp-cta.tsx. Foto del seed: se reubica cuando pasen a Blob.
// Botón contorno blanco como el tablero (el `cta` accent del home no aplica).
export function ConfirmationHelp({ href }: { href: string }) {
  return (
    <section className="relative isolate flex min-h-[240px] items-center overflow-hidden rounded-[24px] bg-dark text-white sm:rounded-[30px] print:hidden">
      <Image
        src="/seed/l69.jpg"
        alt=""
        fill
        sizes="(min-width: 1000px) 1000px, 100vw"
        className="-z-10 object-cover"
      />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(8,14,13,.92)_0%,rgba(8,14,13,.7)_55%,rgba(8,14,13,.2)_100%)]"
      />
      <div className="flex w-full flex-wrap items-center justify-between gap-5 px-[clamp(24px,4vw,48px)] py-10">
        <div className="flex max-w-[480px] flex-[1_1_320px] flex-col gap-2">
          <h2 className="text-[clamp(26px,3vw,34px)] leading-[1.05] tracking-[-0.03em]">
            ¿Necesitas ayuda con tu reserva?
          </h2>
          <p className="leading-[1.55] text-white/90">
            Escríbenos por WhatsApp con tu código.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          className="h-auto min-h-11 gap-2.5 rounded-full border-[1.5px] border-white bg-transparent px-6 py-[15px] text-base font-bold text-white hover:bg-white hover:text-ink"
          render={<a href={href} target="_blank" rel="noopener noreferrer" />}
        >
          <MessageCircle aria-hidden className="size-[18px]" strokeWidth={2.2} />
          Abrir WhatsApp
        </Button>
      </div>
    </section>
  );
}
