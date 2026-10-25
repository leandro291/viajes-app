import { SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

export function SearchForm({
  destinations,
}: {
  destinations: { slug: string; name: string }[]
}) {
  return (
    <form
      action="/paquetes"
      method="get"
      className="relative z-10 mx-4 -mt-[60px] flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card sm:flex-row sm:items-end sm:p-6 lg:mx-auto lg:max-w-3xl"
    >
      <div className="flex flex-1 flex-col gap-2">
        <label
          htmlFor="search-destino"
          className="text-sm font-semibold text-ink"
        >
          ¿A dónde vas?
        </label>
        <NativeSelect
          id="search-destino"
          name="destino"
          defaultValue=""
          className="w-full [&_select]:h-[52px] [&_select]:rounded-field [&_select]:border-[1.5px] [&_select]:border-border-field [&_select]:bg-surface [&_select]:pl-4 [&_select]:text-base"
        >
          <NativeSelectOption value="">Todo el Perú</NativeSelectOption>
          {destinations.map((d) => (
            <NativeSelectOption key={d.slug} value={d.slug}>
              {d.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" variant="cta" className="sm:w-auto">
        <SearchIcon aria-hidden="true" />
        Buscar
      </Button>
    </form>
  )
}
