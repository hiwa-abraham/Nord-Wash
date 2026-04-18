/**
 * Translates a service's name/description using its translation key,
 * falling back to legacy English-name string matching, then to raw text.
 */
import i18n from '@/i18n';

/** Available translation keys for services. Keep in sync with locale files. */
export const SERVICE_NAME_KEYS = [
  'wash_fold',
  'wash_iron',
  'dry_cleaning',
  'ironing_only',
  'express_wash',
  'delicates',
  'bedding',
] as const;

export type ServiceNameKey = typeof SERVICE_NAME_KEYS[number];

// Legacy fallback: match by English service name when no nameKey is set.
const LEGACY_NAME_MAP: Record<string, ServiceNameKey> = {
  'wash & fold': 'wash_fold',
  'wash and fold': 'wash_fold',
  'regular wash': 'wash_fold',
  'wash & iron': 'wash_iron',
  'wash and iron': 'wash_iron',
  'dry cleaning': 'dry_cleaning',
  'ironing only': 'ironing_only',
  'iron only': 'ironing_only',
  'ironing': 'ironing_only',
  'express wash': 'express_wash',
  'express service': 'express_wash',
  'delicates': 'delicates',
  'bedding & linens': 'bedding',
  'bedding': 'bedding',
};

function resolveKey(nameKey?: string | null, name?: string | null): ServiceNameKey | null {
  if (nameKey && (SERVICE_NAME_KEYS as readonly string[]).includes(nameKey)) {
    return nameKey as ServiceNameKey;
  }
  if (name) {
    const match = LEGACY_NAME_MAP[name.trim().toLowerCase()];
    if (match) return match;
  }
  return null;
}

export function translateServiceName(
  name?: string | null,
  nameKey?: string | null
): string {
  const key = resolveKey(nameKey, name);
  if (!key) return name || '';
  const t = i18n.t(`serviceCatalog.${key}.name`);
  return t === `serviceCatalog.${key}.name` ? (name || '') : t;
}

export function translateServiceDescription(
  name?: string | null,
  fallback?: string | null,
  nameKey?: string | null
): string {
  const key = resolveKey(nameKey, name);
  if (!key) return fallback || '';
  const t = i18n.t(`serviceCatalog.${key}.description`);
  return t === `serviceCatalog.${key}.description` ? (fallback || '') : t;
}
