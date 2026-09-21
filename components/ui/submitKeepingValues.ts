import { startTransition, type FormEvent } from 'react';

/**
 * React 19 empties a form once its action has run — error or not. Submitting
 * through a transition instead keeps what the person typed, so a mistyped code
 * or a rate limit never costs them the whole form. Every success path redirects
 * or swaps the form out, so nothing stale is left behind. Before hydration (or
 * without JavaScript) the form still posts to the action as usual.
 */
export function submitKeepingValues(action: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
}
