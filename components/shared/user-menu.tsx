"use client";

import { UserButton } from "@clerk/nextjs";
import { UserRound } from "lucide-react";

// Client component: los estáticos de UserButton (MenuItems, Link) no se acceden desde un Server Component.
export function UserMenu() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          label="Mi cuenta"
          labelIcon={<UserRound className="size-4" />}
          href="/cuenta"
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
