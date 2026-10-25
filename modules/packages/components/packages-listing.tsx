import Link from "next/link";
import { Suspense } from "react";
import { X } from "lucide-react";

import { getDestinations } from "@/modules/destinations";

import { getCategories, getPackages } from "../services/package-service";
import {
  buildListingHref,
  parseListingParams,
  resolveFilters,
} from "../utils/package-filters";
import { ListingSkeleton } from "./listing-skeleton";
import { PackageFilters } from "./package-filters";
import { PackageGrid } from "./package-grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function PackagesListing({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="py-8 lg:py-12">
      <nav aria-label="Migas de pan" className="text-sm text-ink-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-ink">
              Inicio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-bold text-ink">
            Paquetes
          </li>
        </ol>
      </nav>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink lg:text-5xl">
        Paquetes por todo el Perú
      </h1>
      <p className="mt-2 text-ink-muted">Viajes armados, listos para reservar</p>

      <div className="mt-8">
        <Suspense fallback={<ListingSkeleton />}>
          <ListingContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ListingContent({ searchParams }: { searchParams: SearchParams }) {
  const parsed = parseListingParams(await searchParams);
  const [categories, destinations] = await Promise.all([
    getCategories(),
    getDestinations(),
  ]);
  const filters = resolveFilters(parsed, categories, destinations);
  const packages = await getPackages(filters);
  const destination = filters.destino
    ? destinations.find((d) => d.slug === filters.destino)
    : undefined;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-9">
      <PackageFilters filters={filters} categories={categories} />
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {destination && (
            <span className="inline-flex max-w-full items-center rounded-full border border-border bg-surface pl-4 text-sm font-bold text-ink">
              <span className="truncate">Destino: {destination.name}</span>
              <Link
                href={buildListingHref(filters, { destino: undefined })}
                scroll={false}
                aria-label="Quitar destino"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full"
              >
                <X aria-hidden className="size-4" />
              </Link>
            </span>
          )}
          <p aria-live="polite" className="text-sm text-ink-muted">
            {packages.length === 1
              ? "1 paquete disponible"
              : `${packages.length} paquetes disponibles`}
          </p>
        </div>
        <PackageGrid packages={packages} />
      </div>
    </div>
  );
}
