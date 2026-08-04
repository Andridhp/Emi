import { GuidanceLevel } from '@/types/domain';

export type CatalogLifecycle = 'draft' | 'in_review' | 'approved' | 'published' | 'retired' | 'suspended';

export type ClinicalCatalog = {
  id: string;
  code: string;
  version: string;
  lifecycleStatus: CatalogLifecycle;
  countries: string[];
  languages: string[];
  validFrom?: string;
  validUntil?: string;
  rules: Array<{
    id: string;
    stableCode: string;
    stage: 'preconception' | 'pregnancy' | 'postpartum' | 'newborn' | 'infant' | 'child';
    level: GuidanceLevel;
    enabled: boolean;
    sourceUrl: string;
  }>;
};

export type CatalogSelection =
  | { available: true; catalog: ClinicalCatalog; reason: 'current_published_catalog' }
  | { available: false; reason: 'not_published' | 'wrong_jurisdiction' | 'not_yet_valid' | 'expired' | 'no_enabled_rules' };

const normalized = (value: string) => value.trim().toLowerCase();

export function selectClinicalCatalog(catalog: ClinicalCatalog, country: string, language: string, now = new Date()): CatalogSelection {
  if (catalog.lifecycleStatus !== 'published') return { available: false, reason: 'not_published' };
  const countries = catalog.countries.map(normalized);
  const languages = catalog.languages.map(normalized);
  if (!countries.includes(normalized(country)) || !languages.includes(normalized(language))) return { available: false, reason: 'wrong_jurisdiction' };
  if (catalog.validFrom && new Date(catalog.validFrom) > now) return { available: false, reason: 'not_yet_valid' };
  if (catalog.validUntil && new Date(catalog.validUntil) <= now) return { available: false, reason: 'expired' };
  if (!catalog.rules.some((rule) => rule.enabled)) return { available: false, reason: 'no_enabled_rules' };
  return { available: true, catalog, reason: 'current_published_catalog' };
}
