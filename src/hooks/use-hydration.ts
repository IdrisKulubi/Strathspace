import { useEffect, useState, useMemo } from 'react';

/**
 * Hook to handle SSR hydration safely
 * Prevents hydration mismatches by only rendering after hydration is complete
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

/**
 * Hook to safely use Zustand stores with SSR
 * Returns a default value during SSR and the actual value after hydration
 */
export function useSSRSafeStore<T>(
  store: () => T,
  defaultValue: T
): T {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Only call the store after hydration
  const storeValue = useMemo(() => {
    if (!isHydrated) return defaultValue;
    try {
      return store();
    } catch {
      return defaultValue;
    }
  }, [isHydrated, store, defaultValue]);
  
  return storeValue;
} 