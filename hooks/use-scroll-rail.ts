"use client"

import { useCallback, useRef, type RefObject } from "react"

export function useScrollRail<T extends HTMLElement>(): {
  ref: RefObject<T | null>
  scrollByPage: (direction: -1 | 1, ratio?: number) => void
  scrollToStart: () => void
} {
  const ref = useRef<T>(null)

  const behavior = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth"

  const scrollByPage = useCallback((direction: -1 | 1, ratio = 1) => {
    const rail = ref.current
    if (!rail) return
    rail.scrollBy({ left: direction * rail.clientWidth * ratio, behavior: behavior() })
  }, [])

  const scrollToStart = useCallback(() => {
    ref.current?.scrollTo({ left: 0, behavior: behavior() })
  }, [])

  return { ref, scrollByPage, scrollToStart }
}
