import { useRef, useEffect, useCallback } from 'react';

/**
 * Returns a stable callback reference that always calls the latest version.
 * Useful for event handlers that need stable identity but access latest state.
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const ref = useRef<T>(callback);
  
  useEffect(() => {
    ref.current = callback;
  });
  
  return useCallback((...args: any[]) => ref.current(...args), []) as T;
}
