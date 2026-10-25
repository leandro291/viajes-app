import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function WhatsAppCta({ href }: { href: string }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-card bg-primary px-6 py-10 text-primary-foreground lg:flex-row lg:items-center lg:justify-between lg:px-12">
      <div className="flex max-w-xl flex-col gap-2">
        <h2 className="text-2xl text-primary-foreground">
          ¿Quieres un viaje a tu medida?
        </h2>
        <p>Cuéntanos qué buscas y armamos el plan contigo.</p>
      </div>
      {/* Q3: no terracota; sin variante teal en Button, secondary (arena) contrasta sobre el fondo teal. */}
      <Button
        variant="secondary"
        size="lg"
        nativeButton={false}
        render={
          <a href={href} target="_blank" rel="noopener noreferrer" />
        }
      >
        <MessageCircle data-icon="inline-start" />
        Escríbenos por WhatsApp
      </Button>
    </section>
  );
}
