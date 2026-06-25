/**
 * Wraps a promise with a timeout. If the promise doesn't resolve/reject within the timeout,
 * returns the fallback value. Also catches rejections and returns fallback.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise.catch((err) => {
      console.warn(`Promise rejected:`, err, "- using fallback");
      return fallback;
    }),
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn(`Promise timed out after ${timeoutMs}ms, using fallback`);
        resolve(fallback);
      }, timeoutMs)
    ),
  ]);
}
