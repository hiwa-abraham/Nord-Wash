/**
 * Idempotency Key Management
 * 
 * Prevents duplicate operations (especially payments) by tracking
 * unique operation keys. Uses localStorage for client-side tracking
 * and should be validated server-side for critical operations.
 */

// Storage key prefix
const IDEMPOTENCY_PREFIX = 'idempotency_';

// How long to keep keys (24 hours)
const KEY_EXPIRY_MS = 24 * 60 * 60 * 1000;

interface IdempotencyRecord {
  key: string;
  createdAt: number;
  status: 'pending' | 'completed' | 'failed';
  resultId?: string;
}

/**
 * Generate a unique idempotency key based on operation parameters
 */
export function generateIdempotencyKey(
  userId: string,
  operation: string,
  params: Record<string, unknown>
): string {
  const paramsString = JSON.stringify(params, Object.keys(params).sort());
  const combined = `${userId}:${operation}:${paramsString}`;
  
  // Create a hash-like string (simple but effective)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `${operation}_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

/**
 * Check if an operation with this key is already in progress or completed
 */
export function checkIdempotencyKey(key: string): IdempotencyRecord | null {
  try {
    const stored = localStorage.getItem(IDEMPOTENCY_PREFIX + key);
    if (!stored) return null;
    
    const record: IdempotencyRecord = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() - record.createdAt > KEY_EXPIRY_MS) {
      localStorage.removeItem(IDEMPOTENCY_PREFIX + key);
      return null;
    }
    
    return record;
  } catch {
    return null;
  }
}

/**
 * Set an idempotency key as pending (operation starting)
 */
export function setIdempotencyPending(key: string): void {
  const record: IdempotencyRecord = {
    key,
    createdAt: Date.now(),
    status: 'pending',
  };
  
  try {
    localStorage.setItem(IDEMPOTENCY_PREFIX + key, JSON.stringify(record));
  } catch (e) {
    console.warn('Failed to store idempotency key:', e);
  }
}

/**
 * Mark an idempotency key as completed with result
 */
export function setIdempotencyCompleted(key: string, resultId: string): void {
  const record: IdempotencyRecord = {
    key,
    createdAt: Date.now(),
    status: 'completed',
    resultId,
  };
  
  try {
    localStorage.setItem(IDEMPOTENCY_PREFIX + key, JSON.stringify(record));
  } catch (e) {
    console.warn('Failed to update idempotency key:', e);
  }
}

/**
 * Mark an idempotency key as failed (can be retried)
 */
export function setIdempotencyFailed(key: string): void {
  try {
    localStorage.removeItem(IDEMPOTENCY_PREFIX + key);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Clean up expired idempotency keys
 */
export function cleanupExpiredKeys(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(IDEMPOTENCY_PREFIX));
    const now = Date.now();
    
    keys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const record: IdempotencyRecord = JSON.parse(stored);
          if (now - record.createdAt > KEY_EXPIRY_MS) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Remove corrupted entries
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Hook-friendly wrapper for idempotent operations
 */
export async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  options: {
    onDuplicate?: (existingResult: string) => void;
    onPending?: () => void;
  } = {}
): Promise<{ success: true; result: T; key: string } | { success: false; reason: 'duplicate' | 'pending'; existingKey?: string }> {
  // Check existing key
  const existing = checkIdempotencyKey(key);
  
  if (existing) {
    if (existing.status === 'pending') {
      options.onPending?.();
      return { success: false, reason: 'pending' };
    }
    
    if (existing.status === 'completed' && existing.resultId) {
      options.onDuplicate?.(existing.resultId);
      return { success: false, reason: 'duplicate', existingKey: existing.resultId };
    }
  }
  
  // Mark as pending
  setIdempotencyPending(key);
  
  try {
    const result = await operation();
    
    // Extract ID from result if it's an object with id property
    const resultId = (result && typeof result === 'object' && 'id' in result) 
      ? String((result as { id: unknown }).id)
      : String(result);
    
    setIdempotencyCompleted(key, resultId);
    
    return { success: true, result, key };
  } catch (error) {
    setIdempotencyFailed(key);
    throw error;
  }
}
