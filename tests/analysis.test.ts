import { describe, expect, it } from 'vitest';
import { deriveAnalysisCards } from '../src/lib/analysis';
import { profiles, initialEvents } from '../src/data/demo';

describe('Análisis explicable', () => {
  it('separa el perfil y declara la base de cada cálculo', () => {
    const cards = deriveAnalysisCards({ profile: profiles[0], events: [...initialEvents, { ...initialEvents[0], id: 'other', profileId: 'other' }], documents: [], now: new Date('2026-07-16T12:00:00') });
    expect(cards.every((card) => card.evidence.length > 0)).toBe(true);
    expect(cards.find((card) => card.id === 'record-coverage')?.body).not.toContain('13 registros');
  });

  it('no inventa comparaciones cuando faltan dos documentos equivalentes', () => {
    const cards = deriveAnalysisCards({ profile: profiles[1], events: [], documents: [], now: new Date('2026-07-24') });
    const documentary = cards.find((card) => card.id === 'document-learning');
    expect(documentary?.state).toBe('learning');
    expect(documentary?.body).toContain('al menos dos documentos');
  });
});
