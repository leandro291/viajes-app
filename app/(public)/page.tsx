import { buildMetadata } from "@/lib/seo/metadata";
import { HomePage } from "@/modules/home";

export const metadata = buildMetadata({
  path: "/",
  description:
    "Reserva paquetes turísticos y tours de un día por Perú con operadores locales verificados. Compara destinos, precios y fechas en un solo lugar.",
});

export default function Page() {
  return <HomePage />;
}
