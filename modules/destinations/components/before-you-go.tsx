import Image from "next/image";
import { Plus } from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";

import type { FaqDto } from "../types/destination";
import { beforeYouGo } from "../utils/destination-page";

const BLOCK_H2 = "text-[clamp(30px,3.6vw,42px)] text-ink";

function FaqList({ faqs }: { faqs: FaqDto[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {faqs.map((faq) => (
        <li key={faq.id}>
          {/* Sin `name`: cada pregunta se abre de forma independiente (AC20). */}
          <details className="group rounded-[20px] bg-surface px-6 shadow-[0_1px_2px_rgba(11,21,19,.05)]">
            <summary className="flex min-h-[68px] cursor-pointer list-none items-center justify-between gap-3 rounded-[20px] text-lg font-bold focus-visible:outline-offset-[-3px] [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">{faq.question}</span>
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sand motion-safe:transition-transform group-open:rotate-45"
              >
                <Plus className="size-4" strokeWidth={2.6} />
              </span>
            </summary>
            <p className="mb-[22px] leading-[1.6] text-ink-muted">{faq.answer}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}

export function BeforeYouGo({
  altitudeM,
  howToGetText,
  tipsText,
  imageUrl,
  faqs,
}: {
  altitudeM: number | null;
  howToGetText: string | null;
  tipsText: string | null;
  imageUrl: string | null;
  faqs: FaqDto[];
}) {
  const hasLeft = Boolean(howToGetText || tipsText);
  const hasFaqs = faqs.length > 0;
  if (!hasLeft && !hasFaqs) return null;

  const { heading, tipsLabel } = beforeYouGo(altitudeM);

  if (!hasLeft) {
    return (
      <section className="mx-auto w-full max-w-[1240px] px-6 pt-24 pb-[104px]">
        <div className="flex max-w-[820px] flex-col gap-6">
          <SectionHeading eyebrow="Antes de ir" title="Preguntas frecuentes" />
          <FaqList faqs={faqs} />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[1240px] flex-wrap gap-12 px-6 pt-24 pb-[104px]">
      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
        <span className="text-[13px] font-bold tracking-[0.1em] text-accent uppercase">
          Antes de ir
        </span>
        <h2 className={BLOCK_H2}>{heading}</h2>
        {howToGetText && (
          <div className="relative flex min-h-[260px] items-end overflow-hidden rounded-[24px] bg-dark text-white">
            {imageUrl && (
              <Image
                src={imageUrl}
                alt=""
                fill
                sizes="(min-width: 1280px) 500px, (min-width: 768px) 45vw, 100vw"
                className="object-cover"
              />
            )}
            <span
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,14,13,.9),rgba(8,14,13,.1)_70%)]"
            />
            <div className="relative flex flex-col gap-1.5 p-[22px]">
              <h3 className="font-display text-xl font-extrabold">Cómo llegar</h3>
              <p className="leading-normal text-white/90">{howToGetText}</p>
            </div>
          </div>
        )}
        {tipsText && (
          <div className="flex flex-col gap-1.5 rounded-[20px] bg-primary-soft p-[22px]">
            <span className="font-bold text-primary">{tipsLabel}</span>
            <p className="leading-[1.55] text-[#2E4A48]">{tipsText}</p>
          </div>
        )}
      </div>
      {hasFaqs && (
        <div className="flex min-w-0 flex-[1.4_1_480px] flex-col gap-3">
          <h2 className={`${BLOCK_H2} mb-3`}>Preguntas frecuentes</h2>
          <FaqList faqs={faqs} />
        </div>
      )}
    </section>
  );
}
