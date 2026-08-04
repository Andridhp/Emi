import { describe, expect, it } from 'vitest';
import { growthSeries, seriesChange } from '../src/lib/growth';

const event = (id: string, title: string, measurement: string, unit: string, occurredAt: string) => ({ id, profileId: 'p', kind: 'growth' as const, title, detail: '', occurredAt, source: 'parent' as const, data: { measurement, measurementUnit: unit } });

describe('Historial de crecimiento', () => {
  it('normaliza unidades equivalentes y conserva la medición original', () => {
    const points = growthSeries([event('1', 'Peso', '10', 'lb', '2026-01-01')], 'p', 'weight');
    expect(points[0].value).toBe(4.54);
    expect(points[0].original).toBe('10 lb');
  });

  it('excluye unidades desconocidas para evitar gráficas engañosas', () => {
    expect(growthSeries([event('1', 'Talla', '60', 'metros?', '2026-01-01')], 'p', 'height')).toEqual([]);
  });

  it('describe únicamente el cambio entre valores registrados', () => {
    const points = growthSeries([event('1', 'Peso', '4', 'kg', '2026-01-01'), event('2', 'Peso', '5.2', 'kg', '2026-02-01')], 'p', 'weight');
    expect(seriesChange(points)).toMatchObject({ delta: 1.2, count: 2 });
  });
});
