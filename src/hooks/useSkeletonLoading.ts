import { useState, useEffect } from 'react'

/**
 * Prevents skeleton flicker:
 * Shows skeleton only if loading persists > delayMs (~200ms)
 * Once shown, holds skeleton for at least minDisplayMs (~300ms)
 */
export function useSkeletonDelayedLoading(isLoading: boolean, delayMs = 200, minDisplayMs = 300) {
  const [showSkeleton, setShowSkeleton] = useState(false)

  useEffect(() => {
    let delayTimer: NodeJS.Timeout | null = null
    let minTimer: NodeJS.Timeout | null = null
    let visibleSince: number | null = null

    if (isLoading) {
      delayTimer = setTimeout(() => {
        setShowSkeleton(true)
        visibleSince = Date.now()
      }, delayMs)
    } else if (showSkeleton) {
      const elapsed = visibleSince ? Date.now() - visibleSince : minDisplayMs
      const remaining = Math.max(0, minDisplayMs - elapsed)
      minTimer = setTimeout(() => {
        setShowSkeleton(false)
      }, remaining)
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer)
      if (minTimer) clearTimeout(minTimer)
    }
  }, [isLoading, delayMs, minDisplayMs, showSkeleton])

  return showSkeleton
}
