/**
 * Error Tracking & Centralized Error Handling
 * 
 * Provides centralized error tracking, categorization,
 * and reporting for security and debugging purposes.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { secureLog } from './secure-logger';

// Error categories
export type ErrorCategory = 
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'network'
  | 'database'
  | 'security'
  | 'business_logic'
  | 'unknown';

// Error severity
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Tracked error interface
export interface TrackedError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
  url?: string;
  userAgent?: string;
}

// In-memory error buffer for batching
const errorBuffer: TrackedError[] = [];
const MAX_BUFFER_SIZE = 50;
const FLUSH_INTERVAL_MS = 30000;

let flushTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Categorize an error based on its message and type
 */
function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  
  if (message.includes('unauthorized') || message.includes('unauthenticated') || 
      message.includes('login') || message.includes('session')) {
    return 'authentication';
  }
  
  if (message.includes('permission') || message.includes('forbidden') ||
      message.includes('not allowed') || message.includes('access denied')) {
    return 'authorization';
  }
  
  if (message.includes('validation') || message.includes('invalid') ||
      message.includes('required') || name.includes('validation')) {
    return 'validation';
  }
  
  if (message.includes('network') || message.includes('fetch') ||
      message.includes('timeout') || message.includes('connection')) {
    return 'network';
  }
  
  if (message.includes('database') || message.includes('sql') ||
      message.includes('query') || message.includes('supabase')) {
    return 'database';
  }
  
  if (message.includes('security') || message.includes('csrf') ||
      message.includes('xss') || message.includes('injection')) {
    return 'security';
  }
  
  return 'unknown';
}

/**
 * Determine error severity
 */
function determineErrorSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
  // Security and auth errors are high priority
  if (category === 'security') return 'critical';
  if (category === 'authentication') return 'high';
  if (category === 'authorization') return 'high';
  
  // Database errors could indicate data issues
  if (category === 'database') return 'medium';
  
  // Check for specific critical patterns
  const message = error.message.toLowerCase();
  if (message.includes('critical') || message.includes('fatal')) {
    return 'critical';
  }
  
  return 'low';
}

/**
 * Sanitize error context to remove sensitive data
 */
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'apikey', 'api_key', 'auth', 'credit_card'];
  
  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 500) {
      sanitized[key] = value.substring(0, 500) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Track an error
 */
export function trackError(
  error: Error,
  context: Record<string, unknown> = {},
  userId?: string
): TrackedError {
  const category = categorizeError(error);
  const severity = determineErrorSeverity(error, category);
  
  const trackedError: TrackedError = {
    id: generateErrorId(),
    category,
    severity,
    message: error.message,
    stack: error.stack,
    context: sanitizeContext(context),
    timestamp: new Date(),
    userId,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  
  // Add to buffer
  errorBuffer.push(trackedError);
  
  // Log locally
  secureLog.error(`[${category}] ${error.message}`, trackedError.id);
  
  // Flush if buffer is full
  if (errorBuffer.length >= MAX_BUFFER_SIZE) {
    flushErrors();
  } else if (!flushTimeout) {
    // Schedule flush
    flushTimeout = setTimeout(flushErrors, FLUSH_INTERVAL_MS);
  }
  
  // For critical/high severity, log to security events immediately
  if (severity === 'critical' || severity === 'high') {
    logSecurityError(trackedError);
  }
  
  return trackedError;
}

/**
 * Log a security-relevant error
 */
async function logSecurityError(error: TrackedError): Promise<void> {
  try {
    await supabase.rpc('log_security_event', {
      _event_type: `ERROR_${error.category.toUpperCase()}`,
      _severity: error.severity === 'critical' ? 'critical' : 'error',
      _description: `${error.category} error: ${error.message}`,
      _user_id: error.userId || null,
      _ip_address: null,
      _metadata: {
        error_id: error.id,
        category: error.category,
        url: error.url,
        context: error.context,
      } as Json,
    });
  } catch {
    secureLog.error('[ErrorTracking] Failed to log security error');
  }
}

/**
 * Flush error buffer to backend
 */
async function flushErrors(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  
  if (errorBuffer.length === 0) return;
  
  const errorsToFlush = errorBuffer.splice(0, errorBuffer.length);
  
  // Group errors by category for summary logging
  const errorSummary = errorsToFlush.reduce((acc, err) => {
    acc[err.category] = (acc[err.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  try {
    // Log summary to security events
    await supabase.rpc('log_security_event', {
      _event_type: 'ERROR_BATCH',
      _severity: 'info',
      _description: `Batch of ${errorsToFlush.length} errors logged`,
      _user_id: null,
      _ip_address: null,
      _metadata: {
        summary: errorSummary,
        errors: errorsToFlush.map(e => ({
          id: e.id,
          category: e.category,
          severity: e.severity,
          message: e.message,
          timestamp: e.timestamp.toISOString(),
        })),
      } as Json,
    });
  } catch {
    secureLog.error('[ErrorTracking] Failed to flush errors');
    // Re-add errors to buffer if flush failed
    errorBuffer.unshift(...errorsToFlush);
  }
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  recentErrors: TrackedError[];
} {
  const byCategory: Record<ErrorCategory, number> = {
    authentication: 0,
    authorization: 0,
    validation: 0,
    network: 0,
    database: 0,
    security: 0,
    business_logic: 0,
    unknown: 0,
  };
  
  const bySeverity: Record<ErrorSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  
  for (const error of errorBuffer) {
    byCategory[error.category]++;
    bySeverity[error.severity]++;
  }
  
  return {
    total: errorBuffer.length,
    byCategory,
    bySeverity,
    recentErrors: errorBuffer.slice(-10),
  };
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandling(): void {
  if (typeof window === 'undefined') return;
  
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    trackError(
      event.error || new Error(event.message),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught',
      }
    );
  });
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    trackError(error, { type: 'unhandled_rejection' });
  });
  
  secureLog.info('[ErrorTracking] Global error handling initialized');
}

/**
 * Create error boundary helper
 */
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: { componentStack: string }) => {
    trackError(error, {
      component: componentName,
      componentStack: errorInfo.componentStack,
      type: 'react_error_boundary',
    });
  };
}
