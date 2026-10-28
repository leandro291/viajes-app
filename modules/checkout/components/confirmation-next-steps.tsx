// Copy propio (D20): v1 no envía correo ni WhatsApp, así que no se promete.
const STEPS = [
  {
    title: "Guarda tu voucher",
    text: "Descárgalo o guarda esta página: tiene tu código de reserva, la fecha y el punto de encuentro.",
  },
  {
    title: "Lleva tu documento",
    text: "Lleva el documento con el que reservaste. En Machu Picchu es obligatorio para ingresar.",
  },
  {
    title: "Preséntate en el punto de encuentro",
    text: "Llega a la hora indicada y muestra tu código de reserva.",
  },
];

export function ConfirmationNextSteps() {
  return (
    <section aria-labelledby="h-next" className="flex flex-col gap-7 print:hidden">
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-bold tracking-[0.1em] text-accent uppercase">
          Antes de salir
        </span>
        <h2
          id="h-next"
          className="text-[clamp(30px,3.6vw,42px)] leading-none text-ink max-sm:text-[26px]"
        >
          Qué sigue
        </h2>
      </div>
      <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5 p-0">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-3.5">
            <span className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-11 flex-none items-center justify-center rounded-full bg-ink font-display text-lg font-extrabold text-white"
              >
                {i + 1}
              </span>
              <span
                aria-hidden="true"
                className="h-0.5 flex-1 bg-[repeating-linear-gradient(to_right,#D9D2C3_0_8px,transparent_8px_14px)]"
              />
            </span>
            <h3 className="font-display text-[21px] font-bold tracking-[-0.01em] text-ink">
              {step.title}
            </h3>
            <p className="text-base leading-[1.6] text-ink-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
