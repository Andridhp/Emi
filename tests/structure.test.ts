import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { documents } from '../src/data/demo';
import { mobileNavigation, navGroups, primaryNavigation } from '../src/data/navigation';
import { compareConfirmedDocumentFields, confirmedDocumentEvents, confirmedFieldSummaries, documentForProfile, documentsForProfile, proposeDocumentFields } from '../src/lib/documents';

describe('Estructura de la aplicación', () => {
  it('mantiene una navegación principal única y sin rutas duplicadas', () => {
    const routes = primaryNavigation.map((item) => item.href);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes[0]).toBe('/home');
    expect(routes).not.toContain('/');
    expect(mobileNavigation.every((item) => routes.includes(item.href))).toBe(true);
    expect(navGroups.flatMap((group) => group.items).some((item) => item.href === '/report')).toBe(true);
    expect(navGroups.flatMap((group) => group.items).some((item) => item.href === '/assistant')).toBe(true);
  });

  it('mantiene una pantalla real para cada destino del mapa de la aplicación', () => {
    const hrefs = new Set([...primaryNavigation, ...navGroups.flatMap((group) => group.items)].map((item) => item.href));
    const screenFor = (href: string) => href.startsWith('/track/')
      ? resolve(process.cwd(), 'app/track/[kind].tsx')
      : resolve(process.cwd(), `app${href}.tsx`);

    expect([...hrefs].filter((href) => !existsSync(screenFor(href)))).toEqual([]);
  });

  it('separa documentos por perfil y bloquea cruces', () => {
    expect(documentsForProfile(documents, 'emilia').map((item) => item.id)).toEqual(['d3']);
    expect(documentsForProfile(documents, 'pregnancy').map((item) => item.id)).toEqual(['d1', 'd2']);
    expect(documentForProfile(documents, 'd1', 'emilia')).toBeUndefined();
    expect(documentForProfile(documents, 'd1', 'pregnancy')?.name).toContain('Ultrasonido');
  });

  it('requiere selección familiar antes de confirmar propuestas', () => {
    const fields = proposeDocumentFields(documents[1]);
    expect(fields.length).toBeGreaterThan(1);
    expect(fields.some((item) => item.confidence === 'low' && !item.selected)).toBe(true);
    expect(fields.every((item) => item.rawValue === item.value)).toBe(true);
    expect(confirmedFieldSummaries(fields)).not.toContain('Hemoglobina: Dato por confirmar');
  });

  it('deriva eventos únicamente de documentos confirmados y conserva su origen', () => {
    const events = confirmedDocumentEvents(documents);
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.source === 'document')).toBe(true);
    expect(events.some((event) => event.id.includes('d2'))).toBe(false);
    expect(events.find((event) => event.profileId === 'pregnancy')?.kind).toBe('prenatal');
  });

  it('compara solo valores numéricos de documentos confirmados del mismo perfil', () => {
    const first = { ...documents[0], id: 'compare-1', occurredAt: '2026-06-01T10:00:00', analysisStatus: 'confirmed' as const, extractedFields: [{ id: 'weight-1', label: 'Peso fetal estimado', value: '410 g', rawValue: '410 g', selected: true, confidence: 'medium' as const }] };
    const second = { ...documents[0], id: 'compare-2', occurredAt: '2026-07-01T10:00:00', analysisStatus: 'confirmed' as const, extractedFields: [{ id: 'weight-2', label: 'Peso fetal estimado', value: '510 g', rawValue: '510 g', selected: true, confidence: 'medium' as const }] };
    const comparisons = compareConfirmedDocumentFields([first, second, { ...second, id: 'other', profileId: 'otro', extractedFields: [{ ...second.extractedFields[0], value: '999 g' }] }], 'pregnancy');
    expect(comparisons).toHaveLength(1);
    expect(comparisons[0].statement).toContain('410 g a 510 g');
    expect(comparisons[0].statement).not.toContain('999');
  });
});
