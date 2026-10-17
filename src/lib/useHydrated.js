import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * false while rendering prerendered HTML and during hydration, true after.
 * Use it for UI that depends on things the prerender can't know (such as the
 * query string), so the first client render matches the static HTML.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
