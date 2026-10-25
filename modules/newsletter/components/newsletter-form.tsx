"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { subscribeToNewsletter } from "../actions/subscribe-action";
import type { SubscribeState } from "../types/newsletter";

const initialState: SubscribeState = { status: "idle", message: "" };

export function NewsletterForm() {
  // Input controlado: conserva lo escrito en error (incluso tras el reset del <form> de React 19)
  // y se vacía solo en éxito. Evita cambiar `defaultValue` tras el primer render (aviso de Base UI).
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState(
    async (prev: SubscribeState, formData: FormData) => {
      const next = await subscribeToNewsletter(prev, formData);
      if (next.status === "success") setEmail("");
      return next;
    },
    initialState,
  );
  const hasError = state.status === "error";

  return (
    <form action={formAction} noValidate className="flex w-full flex-col gap-3">
      <Label htmlFor="newsletter-email" className="text-white">
        Tu correo
      </Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "newsletter-message" : undefined}
          className="flex-1 border-transparent text-ink"
        />
        <Button type="submit" variant="cta" disabled={pending}>
          {pending ? "Enviando…" : "Suscribirme"}
        </Button>
      </div>
      <p
        id="newsletter-message"
        role={state.status === "success" ? "status" : undefined}
        aria-live="polite"
        className={hasError ? "text-sm font-medium text-accent-soft" : "text-sm font-medium text-white"}
      >
        {state.message}
      </p>
    </form>
  );
}
