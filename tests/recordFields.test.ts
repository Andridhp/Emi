import { describe, expect, it } from 'vitest';
import { recordFieldsFor, summarizeRecordData } from '../src/data/recordFields';

describe('Campos progresivos de registro', () => {
  it('solicita cantidad y tipo de leche para biberón', () => {
    const keys = recordFieldsFor('feeding', 'Biberón').map((field) => field.key);
    expect(keys).toEqual(['milkType', 'amount', 'unit']);
  });

  it('mantiene fuera del resumen los campos vacíos', () => {
    expect(summarizeRecordData({ milkType: 'Leche materna', amount: '90', storage: '' })).toBe('Leche materna · 90');
  });
});
