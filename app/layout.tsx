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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          localization={esES}
          appearance={{ theme: shadcn, variables: { colorInput: "#FFFFFF" } }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
