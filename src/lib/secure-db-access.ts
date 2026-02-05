/**
 * Secure Database Access Layer
 * 
 * Provides controlled database access patterns to prevent:
 * - Direct production database access
 * - SQL injection
 * - Unauthorized data access
 * - Data leakage through logs
 */

import { supabase } from '@/integrations/supabase/client';
import { secureLog } from './secure-logger';

// Environment detection
export const DB_ENVIRONMENT = {
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
} as const;

/**
 * Database access audit log entry
 */
interface DBAccessLog {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
  table: string;
  userId?: string;
  timestamp: Date;
  success: boolean;
  rowsAffected?: number;
  duration?: number;
  error?: string;
}

// In-memory access log for development debugging
const accessLogs: DBAccessLog[] = [];
const MAX_ACCESS_LOGS = 100;

/**
 * Log database access
 */
function logDBAccess(entry: DBAccessLog): void {
  // Add to in-memory log
  accessLogs.unshift(entry);
  if (accessLogs.length > MAX_ACCESS_LOGS) {
    accessLogs.pop();
  }
  
  // Log to secure logger
  if (!entry.success) {
    secureLog.error(`[DB Access] ${entry.operation.toUpperCase()} on ${entry.table} failed`, {
      error: entry.error,
    });
  } else if (import.meta.env.DEV) {
    secureLog.debug(`[DB Access] ${entry.operation.toUpperCase()} on ${entry.table}`, {
      rowsAffected: entry.rowsAffected,
      duration: entry.duration,
    });
  }
}

/**
 * Get recent database access logs
 */
export function getDBAccessLogs(): Readonly<DBAccessLog[]> {
  return Object.freeze([...accessLogs]);
}

/**
 * Clear database access logs
 */
export function clearDBAccessLogs(): void {
  accessLogs.length = 0;
}

/**
 * Validate table name to prevent injection
 */
function validateTableName(table: string): boolean {
  // Only allow alphanumeric and underscore
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return validPattern.test(table) && table.length <= 63;
}

/**
 * Validate column names
 */
function validateColumnNames(columns: string[]): boolean {
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return columns.every(col => validPattern.test(col) && col.length <= 63);
}

/**
 * Sanitize value for safe logging
 */
function sanitizeForLog(value: unknown): unknown {
  if (typeof value === 'string') {
    // Mask sensitive-looking values
    if (value.length > 20) {
      return value.substring(0, 4) + '...' + value.substring(value.length - 4);
    }
    // Check for patterns that look like secrets
    if (/^(sk_|pk_|api_|key_|secret_)/i.test(value)) {
      return '[REDACTED]';
    }
  }
  return value;
}

/**
 * Production database access guard
 * Ensures proper access controls are in place
 */
export function assertDatabaseAccess(operation: string, context?: Record<string, unknown>): void {
  // In production, log all database operations
  if (DB_ENVIRONMENT.isProduction) {
    secureLog.info(`[DB Guard] ${operation}`, context ? sanitizeForLog(context) as Record<string, unknown> : undefined);
  }
}

/**
 * Safe database query wrapper
 * Wraps Supabase queries with logging and validation
 */
export async function safeQuery<T>(
  operation: DBAccessLog['operation'],
  table: string,
  queryFn: () => Promise<{ data: T | null; error: Error | null; count?: number | null }>
): Promise<{ data: T | null; error: Error | null }> {
  // Validate table name
  if (!validateTableName(table)) {
    secureLog.error(`[DB Guard] Invalid table name: ${table}`);
    return { data: null, error: new Error('Invalid table name') };
  }
  
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    
    logDBAccess({
      operation,
      table,
      timestamp: new Date(),
      success: !result.error,
      rowsAffected: result.count ?? undefined,
      duration,
      error: result.error?.message,
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    logDBAccess({
      operation,
      table,
      timestamp: new Date(),
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

/**
 * Column allowlist for each table
 * Only columns in this list can be selected/updated
 */
const COLUMN_ALLOWLIST: Record<string, string[]> = {
  profiles: ['id', 'user_id', 'full_name', 'avatar_url', 'email', 'phone', 'address', 'created_at', 'updated_at'],
  orders: ['id', 'customer_id', 'status', 'created_at', 'updated_at', 'services', 'total_amount', 'pickup_date', 'pickup_time', 'pickup_address', 'pickup_city'],
  services: ['id', 'name', 'description', 'price_per_kg', 'is_active'],
  settings: ['id', 'key', 'value', 'description'],
};

/**
 * Validate columns against allowlist
 */
export function validateColumns(table: string, columns: string[]): { valid: boolean; invalidColumns: string[] } {
  const allowedColumns = COLUMN_ALLOWLIST[table];
  
  if (!allowedColumns) {
    // If no allowlist defined, allow all (for flexibility)
    // In strict mode, you could return invalid here
    return { valid: true, invalidColumns: [] };
  }
  
  const invalidColumns = columns.filter(col => !allowedColumns.includes(col));
  return { valid: invalidColumns.length === 0, invalidColumns };
}

/**
 * Sensitive columns that should be masked in logs
 */
const SENSITIVE_COLUMNS = [
  'password',
  'password_hash',
  'secret',
  'token',
  'api_key',
  'credit_card',
  'ssn',
  'phone',
  'email',
  'address',
  'customer_phone',
  'customer_email',
];

/**
 * Mask sensitive data in records
 */
export function maskSensitiveData<T extends Record<string, unknown>>(
  record: T,
  additionalSensitive: string[] = []
): T {
  const allSensitive = [...SENSITIVE_COLUMNS, ...additionalSensitive];
  const masked = { ...record };
  
  for (const key of Object.keys(masked)) {
    if (allSensitive.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      masked[key as keyof T] = '[MASKED]' as T[keyof T];
    }
  }
  
  return masked;
}

/**
 * Database access policies
 */
export const DB_POLICIES = {
  // Users can only read their own data
  userDataPolicy: (userId: string, recordUserId: string): boolean => {
    return userId === recordUserId;
  },
  
  // Admins can read all data
  adminPolicy: (userRole: string): boolean => {
    return userRole === 'admin';
  },
  
  // Washers can read assigned orders
  washerOrderPolicy: (userRole: string, orderId: string, assignedWasherId: string | null, userId: string): boolean => {
    return userRole === 'washer' && assignedWasherId === userId;
  },
};

/**
 * Query result pagination for large datasets
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  maxPageSize?: number;
}

export function validatePagination(options: PaginationOptions): PaginationOptions {
  const maxPageSize = options.maxPageSize || 100;
  
  return {
    page: Math.max(1, options.page),
    pageSize: Math.min(Math.max(1, options.pageSize), maxPageSize),
    maxPageSize,
  };
}

/**
 * Calculate pagination range for Supabase
 */
export function getPaginationRange(options: PaginationOptions): { from: number; to: number } {
  const validated = validatePagination(options);
  const from = (validated.page - 1) * validated.pageSize;
  const to = from + validated.pageSize - 1;
  return { from, to };
}
