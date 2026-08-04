import { GuidanceLevel, SourceKind } from '@/types/domain';
import { colors } from '@/theme';

export const sourceLabel: Record<SourceKind, string> = {
  parent: 'Registrado', document: 'Extraído', calculated: 'Calculado',
  professional: 'Profesional', ai: 'Interpretación IA'
};

export const levelMeta: Record<GuidanceLevel, { label: string; color: string; background: string }> = {
  expected: { label: 'Esperado', color: colors.sageDark, background: colors.mint },
  observe: { label: 'Observar', color: '#8A6622', background: '#FFF3D7' },
  consult: { label: 'Consultar', color: '#95543A', background: colors.peachSoft },
  urgent: { label: 'Atención inmediata', color: '#913F3F', background: '#FBE4E4' }
};
