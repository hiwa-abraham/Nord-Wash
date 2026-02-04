/**
 * Secrets Rotation Utilities
 * 
 * Tracks secret age and provides rotation reminders.
 * Helps maintain security hygiene with regular credential rotation.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Recommended rotation periods in days
const ROTATION_PERIODS: Record<string, number> = {
  api_key: 90,           // API keys: every 90 days
  database_password: 60, // DB passwords: every 60 days
  jwt_secret: 180,       // JWT secrets: every 6 months
  encryption_key: 365,   // Encryption keys: yearly
  oauth_secret: 90,      // OAuth secrets: every 90 days
  service_account: 90,   // Service accounts: every 90 days
  webhook_secret: 30,    // Webhook secrets: monthly (high rotation)
  default: 90,           // Default: every 90 days
};

export interface SecretMetadata {
  name: string;
  type: string;
  lastRotated: Date;
  nextRotation: Date;
  isOverdue: boolean;
  daysUntilRotation: number;
  rotationPeriodDays: number;
}

export interface RotationReminder {
  secretName: string;
  secretType: string;
  daysOverdue: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

/**
 * Calculate next rotation date based on secret type
 */
export function calculateNextRotation(lastRotated: Date, secretType: string): Date {
  const periodDays = ROTATION_PERIODS[secretType] || ROTATION_PERIODS.default;
  const nextRotation = new Date(lastRotated);
  nextRotation.setDate(nextRotation.getDate() + periodDays);
  return nextRotation;
}

/**
 * Check if a secret needs rotation
 */
export function needsRotation(lastRotated: Date, secretType: string): boolean {
  const nextRotation = calculateNextRotation(lastRotated, secretType);
  return new Date() >= nextRotation;
}

/**
 * Get rotation status for a secret
 */
export function getRotationStatus(
  name: string,
  type: string,
  lastRotated: Date
): SecretMetadata {
  const nextRotation = calculateNextRotation(lastRotated, type);
  const now = new Date();
  const diffMs = nextRotation.getTime() - now.getTime();
  const daysUntilRotation = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return {
    name,
    type,
    lastRotated,
    nextRotation,
    isOverdue: daysUntilRotation < 0,
    daysUntilRotation,
    rotationPeriodDays: ROTATION_PERIODS[type] || ROTATION_PERIODS.default,
  };
}

/**
 * Get rotation reminders for secrets that need attention
 */
export function getRotationReminders(secrets: SecretMetadata[]): RotationReminder[] {
  const reminders: RotationReminder[] = [];
  
  for (const secret of secrets) {
    if (secret.daysUntilRotation <= 14) {
      let severity: RotationReminder['severity'] = 'info';
      let message = '';
      
      if (secret.daysUntilRotation < 0) {
        const daysOverdue = Math.abs(secret.daysUntilRotation);
        severity = daysOverdue > 30 ? 'critical' : 'warning';
        message = `Secret "${secret.name}" is ${daysOverdue} days overdue for rotation`;
      } else if (secret.daysUntilRotation <= 7) {
        severity = 'warning';
        message = `Secret "${secret.name}" needs rotation in ${secret.daysUntilRotation} days`;
      } else {
        severity = 'info';
        message = `Secret "${secret.name}" rotation upcoming in ${secret.daysUntilRotation} days`;
      }
      
      reminders.push({
        secretName: secret.name,
        secretType: secret.type,
        daysOverdue: secret.daysUntilRotation < 0 ? Math.abs(secret.daysUntilRotation) : 0,
        severity,
        message,
      });
    }
  }
  
  // Sort by severity (critical first)
  return reminders.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Log secret rotation event to security events
 */
export async function logSecretRotation(
  secretName: string,
  secretType: string,
  userId?: string
): Promise<void> {
  try {
    await supabase.rpc('log_security_event', {
      _event_type: 'SECRET_ROTATION',
      _severity: 'info',
      _description: `Secret rotated: ${secretName} (${secretType})`,
      _user_id: userId || null,
      _ip_address: null,
      _metadata: {
        secret_name: secretName,
        secret_type: secretType,
        rotated_at: new Date().toISOString(),
      } as Json,
    });
  } catch (error) {
    console.error('[SecretRotation] Failed to log rotation event');
  }
}

/**
 * Log secret rotation failure
 */
export async function logRotationFailure(
  secretName: string,
  secretType: string,
  error: string,
  userId?: string
): Promise<void> {
  try {
    await supabase.rpc('log_security_event', {
      _event_type: 'SECRET_ROTATION_FAILED',
      _severity: 'error',
      _description: `Secret rotation failed: ${secretName}`,
      _user_id: userId || null,
      _ip_address: null,
      _metadata: {
        secret_name: secretName,
        secret_type: secretType,
        error: error,
        attempted_at: new Date().toISOString(),
      } as Json,
    });
  } catch {
    console.error('[SecretRotation] Failed to log rotation failure');
  }
}

/**
 * Generate a secure random secret
 */
export function generateSecureSecret(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure API key with prefix
 */
export function generateApiKey(prefix: string = 'key'): string {
  const randomPart = generateSecureSecret(24);
  return `${prefix}_${randomPart}`;
}

/**
 * Validate secret strength
 */
export function validateSecretStrength(secret: string): {
  isStrong: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;
  
  // Length check
  if (secret.length >= 32) score += 25;
  else if (secret.length >= 16) score += 15;
  else issues.push('Secret should be at least 32 characters');
  
  // Character variety
  if (/[a-z]/.test(secret)) score += 10;
  if (/[A-Z]/.test(secret)) score += 10;
  if (/[0-9]/.test(secret)) score += 10;
  if (/[^a-zA-Z0-9]/.test(secret)) score += 15;
  
  // Entropy check (no repeated patterns)
  const uniqueChars = new Set(secret).size;
  if (uniqueChars >= secret.length * 0.6) score += 20;
  else issues.push('Secret has too many repeated characters');
  
  // Check for common patterns
  const commonPatterns = [
    /^[a-z]+$/i,           // Only letters
    /^[0-9]+$/,            // Only numbers
    /(.)\1{3,}/,           // Same char 4+ times
    /^(abc|123|password)/i, // Common prefixes
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(secret)) {
      score -= 10;
      issues.push('Secret contains predictable patterns');
      break;
    }
  }
  
  // Normalize score
  score = Math.max(0, Math.min(100, score));
  
  return {
    isStrong: score >= 70 && issues.length === 0,
    score,
    issues,
  };
}

/**
 * Best practices for secret management
 */
export const SECRET_BEST_PRACTICES = [
  {
    title: 'Use Environment-Specific Secrets',
    description: 'Never share secrets between development, staging, and production environments.',
  },
  {
    title: 'Rotate Regularly',
    description: 'Rotate secrets every 90 days at minimum, more frequently for high-risk credentials.',
  },
  {
    title: 'Use Least Privilege',
    description: 'Create secrets with the minimum permissions needed for their purpose.',
  },
  {
    title: 'Audit Access',
    description: 'Regularly review who and what has access to each secret.',
  },
  {
    title: 'Use Edge Functions',
    description: 'Never expose private secrets in frontend code. Use edge functions instead.',
  },
  {
    title: 'Encrypt at Rest',
    description: 'Store secrets encrypted. Lovable Cloud handles this automatically.',
  },
  {
    title: 'No Secrets in Code',
    description: 'Never commit secrets to version control. Use environment variables.',
  },
  {
    title: 'Monitor for Leaks',
    description: 'Use secret scanning tools to detect accidental exposure.',
  },
];
