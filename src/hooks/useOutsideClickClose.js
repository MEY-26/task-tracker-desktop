import { useEffect, useRef } from 'react';

const stack = [];

/**
 * Dışa tıklamada onClose. İç içe modallar için yalnızca en üstteki pencere tepki verir
 * (portal'lar aynı document'te kardeş olduğundan aksi üst/alt birlikte kapanır).
 */
export function useOutsideClickClose(open, ref, onClose) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const entry = { ref, onCloseRef };
    stack.push(entry);

    const handler = (event) => {
      if (stack[stack.length - 1] !== entry) return;
      const el = entry.ref.current;
      if (!el) return;
      if (!el.contains(event.target)) entry.onCloseRef.current?.();
    };

    document.addEventListener('mousedown', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler, true);
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [open, ref]);
}
