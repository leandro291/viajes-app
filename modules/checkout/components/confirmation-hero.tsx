import Image from "next/image";
import { Check } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";

// Animaciones del tablero (keyframes wy-pop / wy-up en globals.css), solo sin reduced-motion.
// Clases literales (Tailwind no detecta strings armados) con delays .15 s / .25 s.
const wyUp1 = "motion-safe:animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_.15s_both]";
const wyUp2 = "motion-safe:animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_.25s_both]";

export function ConfirmationHero({ coverImageUrl }: { coverImageUrl: string | null }) {
  return (
    <PageHero
      className="min-h-[440px] sm:min-h-[560px] print:hidden"
      contentClassName="max-w-[880px] items-center justify-center gap-5 pb-[90px] text-center sm:pb-[150px]"
      background={
        coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_35%]"
          />
        ) : undefined
      }
    >
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full border-[3px] border-white bg-primary sm:size-[84px] sm:border-0 sm:bg-accent sm:shadow-[0_0_0_10px_rgba(194,65,12,.25)] motion-safe:animate-[wy-pop_.7s_cubic-bezier(.2,.7,.2,1)_both]"
      >
        <Check className="size-[30px] stroke-[3] text-white sm:size-[42px] sm:stroke-[2.8]" />
      </span>
      <h1
        className={`text-[clamp(40px,7vw,88px)] leading-[.92] text-balance ${wyUp1}`}
      >
        ¡Tu viaje está confirmado!
      </h1>
      <p
        className={`max-w-[540px] text-[clamp(17px,1.6vw,20px)] leading-normal text-white/90 ${wyUp2}`}
      >
        Guarda tu voucher, lo necesitarás el día de la salida.
      </p>
    </PageHero>
  );
}
