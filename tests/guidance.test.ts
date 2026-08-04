import { describe, expect, it } from 'vitest';
import { evaluateObservableFlags, guidanceRules, RULESET_VERSION } from '../src/lib/guidanceEngine';

describe('Motor de orientación segura', () => {
  it('no ofrece tranquilidad cuando no se seleccionan señales', () => {
    const result = evaluateObservableFlags([]);
    expect(result.status).toBe('not_assessed');
    expect(result.level).toBeUndefined();
    expect(result.message).toContain('no confirma');
  });

  it('una señal explícita activa atención inmediata sin depender de IA', () => {
    const result = evaluateObservableFlags(['difficulty_breathing']);
    expect(result.level).toBe('urgent');
    expect(result.matchedRules.map((rule) => rule.id)).toContain('breathing-distress');
  });

  it('conserva versión, revisión y fuentes en cada regla', () => {
    expect(RULESET_VERSION).toMatch(/pilot/);
    expect(guidanceRules.every((rule) => rule.version && rule.reviewBy && rule.sourceUrl.startsWith('https://'))).toBe(true);
    expect(guidanceRules.every((rule) => rule.reviewStatus === 'source_backed_pilot')).toBe(true);
  });
});
