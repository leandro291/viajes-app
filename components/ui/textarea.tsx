import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full min-w-0 rounded-field border-[1.5px] border-border-field bg-surface px-4 py-3 text-base transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_rgba(15,82,87,.12)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-sand disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-base",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
