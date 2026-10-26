import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

export function CheckoutNotice({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      {action && (
        <Link href={action.href} className={buttonVariants({ variant: "cta" })}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
