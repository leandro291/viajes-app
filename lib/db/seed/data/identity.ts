import {
  guides,
  newsletterSubscribers,
  notificationPreferences,
  organizers,
  users,
} from "../../schema";
import { limaDate, seedId } from "../helpers";

type User = typeof users.$inferInsert;

const user = (
  clerkId: string,
  role: NonNullable<User["role"]>,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  country: string,
): User => ({
  id: seedId(`user:${clerkId}`),
  clerkId,
  role,
  firstName,
  lastName,
  email,
  phone,
  country,
});

export const seedUsers: (typeof users.$inferInsert)[] = [
  user("seed_super_admin", "super_admin", "Super", "Admin", "superadmin@wayra.pe", "+51 900 000 001", "Perú"),
  user("seed_admin", "admin", "Rosa", "Huamán", "admin@wayra.pe", "+51 999 111 222", "Perú"),
  user("seed_organizer", "organizer", "Operador", "Wayra", "operador@wayra.pe", "+51 900 000 002", "Perú"),
  user("seed_customer_01", "customer", "María", "Quispe", "maria.q@correo.com", "+51 987 654 321", "Perú"),
  user("seed_customer_02", "customer", "Lucía", "Fernández", "lucia.f@correo.com", "+54 9 11 5555 0101", "Argentina"),
  user("seed_customer_03", "customer", "Diego", "Salazar", "dsalazar@correo.com", "+51 945 112 233", "Perú"),
  user("seed_customer_04", "customer", "Valeria", "Rojas", "vrojas@correo.com", "+56 9 8765 4321", "Chile"),
  user("seed_customer_05", "customer", "Ana", "Torres", "ana.torres@correo.com", "+51 912 345 678", "Perú"),
  user("seed_customer_06", "customer", "Andrés", "Castillo", "acastillo@correo.com", "+57 300 123 4567", "Colombia"),
  user("seed_customer_07", "customer", "Carlos", "Mendoza", "cmendoza@correo.com", "+51 956 789 012", "Perú"),
  user("seed_customer_08", "customer", "Jorge", "Ramírez", "jramirez@correo.com", "+52 55 1234 5678", "México"),
];

export const seedOrganizers: (typeof organizers.$inferInsert)[] = [
  {
    id: seedId("organizer:wayra"),
    userId: seedId("user:seed_organizer"),
    businessName: "Wayra Perú S.A.C.",
    ruc: "20000000001",
    whatsapp: "+51 900 000 003",
    status: "active",
  },
];

export const seedNotificationPreferences: (typeof notificationPreferences.$inferInsert)[] =
  ["seed_super_admin", "seed_admin", "seed_organizer"].flatMap((clerkId) => [
    { userId: seedId(`user:${clerkId}`), key: "new_booking" as const, enabled: true },
    { userId: seedId(`user:${clerkId}`), key: "cancellations" as const, enabled: true },
    { userId: seedId(`user:${clerkId}`), key: "weekly_summary" as const, enabled: false },
  ]);

export const seedGuides: (typeof guides.$inferInsert)[] = [
  ["wilber-c", "Wilber C.", "+51 900 000 011"],
  ["rocio-m", "Rocío M.", "+51 900 000 012"],
  ["ivan-p", "Iván P.", "+51 900 000 013"],
  ["kiara-s", "Kiara S.", "+51 900 000 014"],
].map(([slug, name, phone]) => ({
  id: seedId(`guide:${slug}`),
  organizerId: seedId("organizer:wayra"),
  name,
  phone,
}));

export const seedNewsletterSubscribers: (typeof newsletterSubscribers.$inferInsert)[] = [
  ["lector1@example.com", "2026-10-01", null],
  ["lector2@example.com", "2026-10-08", null],
  ["lector3@example.com", "2026-10-15", null],
  ["baja@example.com", "2026-09-20", "2026-10-10"],
].map(([email, subscribed, unsubscribed]) => ({
  id: seedId(`newsletter:${email}`),
  email: email!,
  subscribedAt: limaDate(subscribed!, "12:00"),
  unsubscribedAt: unsubscribed ? limaDate(unsubscribed, "12:00") : null,
}));
