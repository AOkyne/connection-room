import { useState, useEffect, useRef } from "react";

interface UseAsyncDataOptions {
  timeout?: number; // ms, default 10000
  onError?: (error: Error) => void;
}

interface UseAsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  deps?: React.DependencyList,
  options: UseAsyncDataOptions = {}
): UseAsyncDataState<T> {
  const { timeout = 10000, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const load = async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    // Set up timeout
    timeoutIdRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        const timeoutError = new Error(
          `Data loading timed out after ${timeout}ms`
        );
        setError(timeoutError);
        setLoading(false);
        onError?.(timeoutError);
      }
    }, timeout);

    try {
      const result = await fetchFn();
      if (isMountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      }
    } finally {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    load();

    return () => {
      isMountedRef.current = false;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, deps);

  return {
    data,
    loading,
    error,
    retry: load,
  };
}
