// Esqueleto de carga para páginas de lista (Suspense fallback). Decorativo: oculto a lectores de pantalla.
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ))}
    </div>
  );
}
