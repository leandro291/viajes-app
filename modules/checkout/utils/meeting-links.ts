export function buildMapLinks(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { google: string; waze: string } | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  };
}
