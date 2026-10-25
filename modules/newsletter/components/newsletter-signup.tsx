import { NewsletterForm } from "./newsletter-form";

export function NewsletterSignup() {
  return (
    <section
      aria-labelledby="newsletter-title"
      className="mx-auto w-full max-w-[1240px] px-6 py-24"
    >
      <div className="flex flex-col gap-6 rounded-[32px] bg-dark px-6 py-10 text-white md:px-12 md:py-14 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="flex max-w-xl flex-col gap-3">
          <h2
            id="newsletter-title"
            className="font-display text-[clamp(30px,3.6vw,44px)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance"
          >
            Recibe las ofertas antes que nadie
          </h2>
          <p className="text-[17px] leading-[1.55] text-white/90">
            Déjanos tu correo y te avisamos cuando haya nuevas ofertas.
          </p>
        </div>
        <div className="w-full lg:max-w-md">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
