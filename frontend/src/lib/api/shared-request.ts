/**
 * Shares a pending request among the callers with the same key: an effect
 * mounted twice (React Strict Mode) or two components asking at once send
 * it only once. A key settled is requested again.
 */
export function sharedRequest<T>(request: () => Promise<T>): (key: string) => Promise<T> {
  const pending = new Map<string, Promise<T>>();
  return (key) => {
    let shared = pending.get(key);
    if (!shared) {
      shared = request().finally(() => pending.delete(key));
      pending.set(key, shared);
    }
    return shared;
  };
}
