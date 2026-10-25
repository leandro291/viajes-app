import { esES } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wayra · Paquetes y tours en Perú",
    template: "%s · Wayra",
  },
  description:
    "Descubre y reserva paquetes y tours de un día por Perú con operadores locales.",
};

// Mismos textos que el encabezado: "Ingresar" y "Crear cuenta".
const localization = {
  ...esES,
  signIn: {
    ...esES.signIn,
    start: {
      ...esES.signIn?.start,
      title: "Ingresar",
      actionLink: "Crear cuenta",
    },
  },
  signUp: {
    ...esES.signUp,
    start: { ...esES.signUp?.start, actionLink: "Ingresar" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          localization={localization}
          appearance={{ theme: shadcn, variables: { colorInput: "#FFFFFF" } }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
