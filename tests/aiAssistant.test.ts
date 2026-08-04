import { describe, expect, it, vi } from 'vitest';
import { createDemoAssistantResult, validateAiAssistantResult } from '../src/lib/aiAssistant';
import type { DocumentRecord, FamilyEvent, FamilyProfile } from '../src/types/domain';

vi.mock('../src/lib/supabase', () => ({ supabase: null }));

describe('Asistente Emi', () => {
  const profile: FamilyProfile = { id: 'emi', name: 'Emi', stage: 'child', avatar: 'E', createdAt: '2026-01-01', birthDate: '2026-01-01' };
  const events: FamilyEvent[] = [{ id: 'sleep-1', profileId: 'emi', kind: 'sleep', title: 'Siesta', detail: 'En cuna', occurredAt: '2026-07-31T14:00:00Z', source: 'parent', data: { startedAt: '2026-07-31T14:00:00Z', endedAt: '2026-07-31T14:40:00Z' } }];
  const documents: DocumentRecord[] = [];

  it('crea una demostración local claramente diferenciada de IA', () => {
    const result = createDemoAssistantResult({ profile, events, documents, purpose: 'recent_summary', now: new Date('2026-08-01T12:00:00Z') });
    expect(result.demo).toBe(true);
    expect(result.model).toBe('motor-local-determinista');
    expect(result.summary).toContain('no envía información');
    expect(result.limitations.some((item) => item.includes('diagnóstico'))).toBe(true);
  });

  it('valida y limita una respuesta estructurada antes de mostrarla', () => {
    const result = validateAiAssistantResult({
      summary: 'Resumen verificable',
      observations: [{ title: 'Cambio temporal', statement: 'Se registró en dos fechas.', evidenceIds: ['event:1'] }],
      missingData: Array.from({ length: 12 }, (_, index) => `Dato ${index}`),
      suggestedQuestions: ['¿Conviene comentarlo en consulta?'],
      limitations: ['No es un diagnóstico.'],
      generatedAt: '2026-08-01T12:00:00Z', model: 'gpt-test', requestId: 'req-test'
    });
    expect(result.demo).toBe(false);
    expect(result.observations[0].evidenceIds).toEqual(['event:1']);
    expect(result.missingData).toHaveLength(8);
  });

  it('rechaza respuestas sin resumen', () => {
    expect(() => validateAiAssistantResult({ observations: [] })).toThrow('invalid_assistant_response');
  });
});
