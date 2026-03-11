import { useEffect } from 'react';

/**
 * Prevents browser autofill on form inputs.
 * Runs on mount and at intervals to catch dynamically added inputs.
 * Uses 200ms interval (less aggressive than 50ms) to reduce performance impact.
 */
export function usePreventAutofill() {
  useEffect(() => {
    const preventAutofill = () => {
      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => {
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('data-lpignore', 'true');
        input.setAttribute('data-form-type', 'other');

        if (input.type === 'password') {
          input.setAttribute('autocomplete', 'new-password');
          input.setAttribute('data-lpignore', 'true');
          input.setAttribute('data-form-type', 'other');
        }

        if (input.placeholder && (input.placeholder.includes('ara') || input.placeholder.includes('search'))) {
          input.setAttribute('autocomplete', 'off');
          input.setAttribute('data-lpignore', 'true');
          input.setAttribute('data-form-type', 'other');
        }

        input.addEventListener('focus', (e) => {
          e.target.setAttribute('autocomplete', 'off');
          e.target.setAttribute('data-lpignore', 'true');
        });

        input.addEventListener('input', (e) => {
          if (e.target.value && !e.isTrusted) {
            e.target.value = '';
          }
        });
        input.addEventListener('animationstart', (e) => {
          if (e.animationName === 'onAutoFillStart') {
            e.target.value = '';
          }
        });
      });
    };

    preventAutofill();
    const interval = setInterval(preventAutofill, 200);
    return () => clearInterval(interval);
  }, []);
}
