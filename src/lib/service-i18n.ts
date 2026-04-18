/**
 * Maps service names/descriptions stored in the database (English) to
 * i18n translation keys, so they can be displayed in the user's language.
 *
 * Falls back to the original DB value if no translation key matches.
 */
import i18n from '@/i18n';

const NAME_KEY_MAP: Record<string, string> = {
  'wash & fold': 'serviceCatalog.wash_fold.name',
  'wash and fold': 'serviceCatalog.wash_fold.name',
  'wash & iron': 'serviceCatalog.wash_iron.name',
  'wash and iron': 'serviceCatalog.wash_iron.name',
  'dry cleaning': 'serviceCatalog.dry_cleaning.name',
  'ironing only': 'serviceCatalog.ironing_only.name',
  'ironing': 'serviceCatalog.ironing_only.name',
  'express wash': 'serviceCatalog.express_wash.name',
  'delicates': 'serviceCatalog.delicates.name',
  'bedding & linens': 'serviceCatalog.bedding.name',
  'bedding': 'serviceCatalog.bedding.name',
};

const DESC_KEY_MAP: Record<string, string> = {
  'wash & fold': 'serviceCatalog.wash_fold.description',
  'wash and fold': 'serviceCatalog.wash_fold.description',
  'wash & iron': 'serviceCatalog.wash_iron.description',
  'wash and iron': 'serviceCatalog.wash_iron.description',
  'dry cleaning': 'serviceCatalog.dry_cleaning.description',
  'ironing only': 'serviceCatalog.ironing_only.description',
  'ironing': 'serviceCatalog.ironing_only.description',
  'express wash': 'serviceCatalog.express_wash.description',
  'delicates': 'serviceCatalog.delicates.description',
  'bedding & linens': 'serviceCatalog.bedding.description',
  'bedding': 'serviceCatalog.bedding.description',
};

export function translateServiceName(name?: string | null): string {
  if (!name) return '';
  const key = NAME_KEY_MAP[name.trim().toLowerCase()];
  if (!key) return name;
  const translated = i18n.t(key);
  return translated === key ? name : translated;
}

export function translateServiceDescription(
  serviceName?: string | null,
  fallback?: string | null
): string {
  if (!serviceName) return fallback || '';
  const key = DESC_KEY_MAP[serviceName.trim().toLowerCase()];
  if (!key) return fallback || '';
  const translated = i18n.t(key);
  return translated === key ? fallback || '' : translated;
}
