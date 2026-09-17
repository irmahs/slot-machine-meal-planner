import { useSyncExternalStore } from 'react';

/** Where the drawer stops sliding over the content and becomes a docked sidebar. */
export const DESKTOP = '(min-width: 900px)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
