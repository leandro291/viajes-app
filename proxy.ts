import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { hasRole, roleFromClaims, type Role } from "@/lib/auth/roles";

// Rol mínimo por grupo (ARCHITECTURE §4). Lo demás es público.
const protectedRoutes: [ReturnType<typeof createRouteMatcher>, Role][] = [
  [createRouteMatcher(["/pago(.*)", "/confirmacion(.*)", "/mis-reservas(.*)", "/cuenta(.*)"]), "customer"],
  [createRouteMatcher(["/operador(.*)"]), "organizer"],
  // Antes de "/admin(.*)": gana la primera regla que coincide.
  [createRouteMatcher(["/admin/administradores(.*)", "/admin/configuracion(.*)"]), "super_admin"],
  [createRouteMatcher(["/admin(.*)"]), "admin"],
];

export default clerkMiddleware(async (auth, req) => {
  const min = protectedRoutes.find(([matches]) => matches(req))?.[1];
  if (!min) return;

  const { userId, sessionClaims, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });
  if (!hasRole(roleFromClaims(sessionClaims), min)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
