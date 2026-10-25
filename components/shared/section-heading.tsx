import type { ReactNode } from "react"

type SectionHeadingProps = {
  eyebrow: string
  title: ReactNode
  /** Enlaces o controles alineados a la derecha del título. */
  children?: ReactNode
}

export function SectionHeading({ eyebrow, title, children }: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-bold tracking-[0.1em] text-accent uppercase">
          {eyebrow}
        </span>
        <h2 className="text-ink">{title}</h2>
      </div>
      {children}
    </div>
  )
}
