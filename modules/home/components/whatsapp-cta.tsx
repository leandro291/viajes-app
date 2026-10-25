import Image from "next/image";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

// Foto del seed (D9): se reubica cuando las fotos pasen a Blob.
export function WhatsAppCta({ href }: { href: string }) {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 pt-[110px] pb-24">
      <div className="relative isolate flex min-h-[340px] items-center overflow-hidden rounded-[32px] bg-dark text-white">
        <Image
          src="/seed/l69.jpg"
          alt=""
          fill
          sizes="(min-width: 1240px) 1240px, 100vw"
          className="-z-10 object-cover"
        />
        <span
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(8,14,13,.9)_0%,rgba(8,14,13,.7)_45%,rgba(8,14,13,.15)_100%)]"
        />
        <div className="flex max-w-[560px] flex-col gap-[18px] px-[clamp(28px,5vw,64px)] py-14">
          <h2 className="text-[clamp(30px,3.6vw,44px)] leading-[1.02]">
            ¿Un viaje a tu medida?
          </h2>
          <p className="text-lg leading-[1.55] text-white/90">
            Cuéntanos fechas, presupuesto y qué te gustaría vivir.
          </p>
          {/* Pill accent como el tablero (D11); no comparte viewport con otro CTA accent. */}
          <Button
            variant="cta"
            nativeButton={false}
            className="h-auto gap-2.5 self-start px-[26px] py-4 text-base"
            render={<a href={href} target="_blank" rel="noopener noreferrer" />}
          >
            <MessageCircle aria-hidden className="size-[18px]" strokeWidth={2.2} />
            Escríbenos por WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
}
