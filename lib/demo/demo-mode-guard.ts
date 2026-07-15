/**
 * Demo Mode Guard - Centralized protection against accidental production writes
 *
 * Prevents data leakage and accidental production writes when in demo mode.
 * v1.3.1: Foundation for strengthened demo/production isolation
 */

import { isDemoMode } from '@/lib/app-mode';

/**
 * Asserts that we're NOT in demo mode
 * Throws error if trying to write to production from demo context
 */
export function assertNotDemoMode(context: string): void {
  if (isDemoMode()) {
    throw new Error(
      `Demo mode: Cannot write to production Supabase (${context}). ` +
      `Use localStorage or demo fallbacks instead.`
    );
  }
}

/**
 * Safely wraps a Supabase write operation with demo mode protection
 *
 * Usage:
 * ```
 * const result = await demoSafeWrite(
 *   () => supabase.from('posts').insert({...}),
 *   { demoFallback: () => createLocalPost(...) }
 * );
 * ```
 */
export async function demoSafeWrite<T>(
  // PromiseLike, not Promise: Supabase query builders are thenable but don't
  // implement catch/finally/toStringTag, so they aren't structurally a Promise.
  writeOperation: () => PromiseLike<T>,
  options: {
    demoFallback?: () => Promise<T> | T;
    context?: string;
    warn?: boolean;
  } = {}
): Promise<T> {
  const { demoFallback, context = 'unknown', warn = true } = options;

  if (isDemoMode()) {
    if (warn) {
      console.warn(
        `[Demo Mode] Skipping write operation: ${context}`,
        'Using demo fallback if available'
      );
    }

    if (demoFallback) {
      return demoFallback();
    }

    throw new Error(
      `Demo mode write attempted (${context}) but no demo fallback provided`
    );
  }

  return writeOperation();
}

/**
 * Safely wraps localStorage writes with explicit demo mode context
 *
 * Usage:
 * ```
 * await demoLocalStorage('demo-reflections', reflections);
 * ```
 */
export function demoLocalStorage(key: string, value: any): void {
  if (typeof localStorage === 'undefined') {
    console.warn(`[Demo Mode] localStorage not available: ${key}`);
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[Demo Mode] Failed to write to localStorage:${key}`, error);
  }
}

/**
 * Safely reads from localStorage with error handling
 */
export function demoLocalStorageGet<T>(key: string, defaultValue?: T): T | undefined {
  if (typeof localStorage === 'undefined') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`[Demo Mode] Failed to read from localStorage:${key}`, error);
    return defaultValue;
  }
}

/**
 * Clears all demo-mode data from localStorage
 * Called on logout or when switching to production
 */
export function clearDemoData(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const keysToRemove = Array.from(Object.keys(localStorage)).filter(
    key => key.startsWith('connection-room:') || key.startsWith('demo-')
  );

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Demo Mode] Failed to clear localStorage:${key}`, error);
    }
  });

  console.log(`[Demo Mode] Cleared ${keysToRemove.length} demo data keys`);
}

/**
 * Validates that data was NOT accidentally written to production
 * Use for testing/verification
 */
export async function verifyDemoModeIsolation(
  supabaseClient: any,
  testData: { tableName: string; id: string }[]
): Promise<{ isolated: boolean; leakedData: any[] }> {
  if (!supabaseClient || isDemoMode()) {
    return { isolated: true, leakedData: [] };
  }

  const leakedData = [];

  for (const test of testData) {
    try {
      const { data } = await supabaseClient
        .from(test.tableName)
        .select('*')
        .eq('id', test.id);

      if (data && data.length > 0) {
        leakedData.push({
          table: test.tableName,
          id: test.id,
          data: data[0],
        });
      }
    } catch (error) {
      // Query errors are expected if data wasn't written
      console.debug(`[Isolation Check] Query error (expected): ${test.tableName}`, error);
    }
  }

  return {
    isolated: leakedData.length === 0,
    leakedData,
  };
}

/**
 * Creates a demo-safe wrapper for async data mutations
 *
 * Usage:
 * ```
 * const safeMutation = createDemoSafeMutation(async (data) => {
 *   return supabase.from('posts').insert(data);
 * });
 *
 * const result = await safeMutation(postData);
 * ```
 */
export function createDemoSafeMutation<T, R>(
  operation: (data: T) => Promise<R>,
  demoFallback?: (data: T) => R | Promise<R>
) {
  return async (data: T): Promise<R> => {
    if (isDemoMode()) {
      if (demoFallback) {
        console.warn('[Demo Mode] Using demo fallback for mutation');
        return demoFallback(data);
      }
      throw new Error('Demo mode mutation attempted without fallback');
    }
    return operation(data);
  };
}

/**
 * Demo mode context provider interface
 * For future implementation with React Context
 */
export interface DemoModeContextValue {
  isDemo: boolean;
  assertProduction: () => void;
  safeWrite: typeof demoSafeWrite;
  clearData: () => void;
  localStorageGet: typeof demoLocalStorageGet;
  localStorageSet: typeof demoLocalStorage;
}

/**
 * Log helper for demo mode operations
 */
export function logDemoOperation(
  operation: string,
  details?: Record<string, any>
): void {
  if (!isDemoMode()) {
    return;
  }

  console.log(
    `[Demo] ${operation}`,
    details ? JSON.stringify(details, null, 2) : ''
  );
}
