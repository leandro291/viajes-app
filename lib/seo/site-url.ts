const FALLBACK_URL = "http://localhost:3000";

function toOrigin(value: string | undefined): string | null {
  try {
    const url = new URL((value ?? "").trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function getSiteUrl(): string {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return (
    toOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
    (prod ? toOrigin(`https://${prod}`) : null) ??
    FALLBACK_URL
  );
}
