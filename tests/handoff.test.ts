import { describe, expect, it } from 'vitest';
import { createCareHandoff } from '../src/lib/handoff';
import { FamilyEvent } from '../src/types/domain';

const events: FamilyEvent[] = [
  { id: '1', profileId: 'baby', kind: 'feeding', title: 'Lactancia', detail: '', occurredAt: '2026-07-25T10:00:00Z', source: 'parent' },
  { id: '2', profileId: 'baby', kind: 'sleep', title: 'Sueño', detail: '', occurredAt: '2026-07-25T11:00:00Z', source: 'calculated', value: 75, unit: 'min' },
  { id: '3', profileId: 'baby', kind: 'diaper', title: 'Pañal', detail: 'Ambos', occurredAt: '2026-07-25T12:00:00Z', source: 'parent' },
  { id: '4', profileId: 'baby', kind: 'temperature', title: 'Temperatura', detail: '', occurredAt: '2026-07-25T13:00:00Z', source: 'parent', value: 98.1, unit: '°F' },
  { id: '5', profileId: 'baby', kind: 'comfort', title: 'Masaje', detail: '', occurredAt: '2026-07-25T14:00:00Z', source: 'parent' },
  { id: 'old', profileId: 'baby', kind: 'feeding', title: 'Anterior', detail: '', occurredAt: '2026-07-24T01:00:00Z', source: 'parent' },
  { id: 'other', profileId: 'other', kind: 'medicine', title: 'Otro perfil', detail: '', occurredAt: '2026-07-25T14:00:00Z', source: 'parent' }
];

describe('Relevo de cuidados', () => {
  it('incluye únicamente el perfil y periodo seleccionados', () => {
    const result = createCareHandoff(events, 'baby', 6, new Date('2026-07-25T15:00:00Z'));
    expect(result.events.map((event) => event.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(result.feedings).toBe(1);
    expect(result.sleepMinutes).toBe(75);
    expect(result.comfort).toBe(1);
  });

  it('cuenta un pañal ambos en las dos categorías sin duplicar el total', () => {
    const result = createCareHandoff(events, 'baby', 6, new Date('2026-07-25T15:00:00Z'));
    expect(result.diapers).toBe(1);
    expect(result.wetDiapers).toBe(1);
    expect(result.bowelMovements).toBe(1);
  });

  it('conserva valor y unidad de la última temperatura sin interpretarlos', () => {
    const result = createCareHandoff(events, 'baby', 6, new Date('2026-07-25T15:00:00Z'));
    expect(result.latestTemperature).toEqual({ value: 98.1, unit: '°F', occurredAt: '2026-07-25T13:00:00Z' });
    expect(result.wellbeing).toBe(1);
  });

  it('explica mediante estado que un periodo puede no tener registros', () => {
    const result = createCareHandoff(events, 'baby', 6, new Date('2026-07-23T15:00:00Z'));
    expect(result.hasRecords).toBe(false);
    expect(result.events).toEqual([]);
  });
});
