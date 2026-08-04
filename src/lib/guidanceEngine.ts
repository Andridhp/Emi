import { GuidanceLevel } from '@/types/domain';

export type ObservableFlag = 'difficulty_breathing' | 'blue_gray_color' | 'seizure' | 'unresponsive';

export type GuidanceRule = {
  id: string;
  version: string;
  level: GuidanceLevel;
  flag: ObservableFlag;
  label: string;
  sourceName: string;
  sourceUrl: string;
  reviewStatus: 'source_backed_pilot' | 'clinician_approved';
  reviewBy: string;
};

export type GuidanceResult = {
  status: 'not_assessed' | 'classified';
  level?: GuidanceLevel;
  title: string;
  message: string;
  action?: string;
  matchedRules: GuidanceRule[];
  rulesetVersion: string;
};

export const RULESET_VERSION = 'emergency-signs-pilot-2026.07';

export const guidanceRules: GuidanceRule[] = [
  { id: 'breathing-distress', version: '1.0', level: 'urgent', flag: 'difficulty_breathing', label: 'Dificultad marcada para respirar', sourceName: 'OMS · Mortalidad neonatal', sourceUrl: 'https://www.who.int/es/news-room/fact-sheets/detail/newborn-mortality', reviewStatus: 'source_backed_pilot', reviewBy: '2026-10-01' },
  { id: 'blue-gray-color', version: '1.0', level: 'urgent', flag: 'blue_gray_color', label: 'Labios, cara o piel azulados o grisáceos', sourceName: 'American Academy of Pediatrics · HealthyChildren', sourceUrl: 'https://www.healthychildren.org/English/health-issues/injuries-emergencies/Pages/When-to-Call-Emergency-Medical-Services-EMS.aspx', reviewStatus: 'source_backed_pilot', reviewBy: '2026-10-01' },
  { id: 'seizure', version: '1.0', level: 'urgent', flag: 'seizure', label: 'Convulsión', sourceName: 'OMS · Mortalidad neonatal', sourceUrl: 'https://www.who.int/es/news-room/fact-sheets/detail/newborn-mortality', reviewStatus: 'source_backed_pilot', reviewBy: '2026-10-01' },
  { id: 'unresponsive', version: '1.0', level: 'urgent', flag: 'unresponsive', label: 'No responde o es muy difícil despertarle', sourceName: 'American Academy of Pediatrics · HealthyChildren', sourceUrl: 'https://www.healthychildren.org/English/family-life/health-management/Pages/urgent-care-ER-or-pediatrician-a-parent-guide.aspx', reviewStatus: 'source_backed_pilot', reviewBy: '2026-10-01' }
];

export function evaluateObservableFlags(flags: ObservableFlag[]): GuidanceResult {
  const selected = new Set(flags);
  const matchedRules = guidanceRules.filter((rule) => selected.has(rule.flag));
  if (!matchedRules.length) return {
    status: 'not_assessed',
    title: 'Sin señales seleccionadas',
    message: 'Esta pantalla no confirma que todo esté bien. Si algo te preocupa, contacta a un profesional aunque ninguna opción coincida.',
    matchedRules: [],
    rulesetVersion: RULESET_VERSION
  };
  return {
    status: 'classified',
    level: 'urgent',
    title: 'Atención inmediata',
    message: 'Marcaste una o más señales que requieren valoración inmediata. Emi no determina la causa ni realiza un diagnóstico.',
    action: 'Busca atención médica inmediata. Si existe peligro en este momento, contacta a los servicios de emergencia de tu localidad.',
    matchedRules,
    rulesetVersion: RULESET_VERSION
  };
}
