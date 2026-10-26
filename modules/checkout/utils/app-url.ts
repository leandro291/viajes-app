/** Origen público de la app (base de success_url/cancel_url de Stripe). Sin fallback (spec Q3). */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const fail = () =>
    new Error("NEXT_PUBLIC_APP_URL falta o no es una URL http(s) válida.");
  if (!raw) throw fail();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw fail();
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw fail();
  return url.origin;
}
