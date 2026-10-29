"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

type ConfirmResult = { ok: true } | { ok: false; message: string }

type ConfirmActionDialogProps = {
  trigger: React.ReactElement
  title: string
  description: React.ReactNode
  confirmLabel: string
  pendingLabel?: string
  dismissLabel?: string
  onConfirm: () => Promise<ConfirmResult>
}

const GENERIC_ERROR = "No pudimos completar la acción. Inténtalo de nuevo."

export function ConfirmActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel = "Eliminando…",
  dismissLabel = "Cancelar",
  onConfirm,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (pending) return
    setOpen(next)
    if (next) setError(null)
  }

  async function handleConfirm() {
    setPending(true)
    setError(null)
    try {
      const result = await onConfirm()
      if (result.ok) setOpen(false)
      else setError(result.message)
    } catch {
      setError(GENERIC_ERROR)
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent className="motion-reduce:animate-none">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base" render={<div />}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{dismissLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
