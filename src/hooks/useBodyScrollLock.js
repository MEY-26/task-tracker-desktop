import { useEffect } from 'react';

/**
 * Locks body scroll when any modal/overlay is open.
 */
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (isLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLocked]);
}
