/**
 * Shares a pending request among the callers with the same key: an effect
 * mounted twice (React Strict Mode) or two components asking at once send
 * it only once. A key settled is requested again. The key identifies the
 * arguments.
 */
export function sharedRequest<T, A extends unknown[] = []>(
  request: (...args: A) => Promise<T>,
): (key: string, ...args: A) => Promise<T> {
  const pending = new Map<string, Promise<T>>();
  return (key, ...args) => {
    let shared = pending.get(key);
    if (!shared) {
      shared = request(...args).finally(() => pending.delete(key));
      pending.set(key, shared);
    }
    return shared;
  };
}
