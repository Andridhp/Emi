import { describe, expect, it } from 'vitest';
import { treatmentCompleteness, treatmentHistory } from '../src/lib/healthHistory';

describe('Historial de medicamentos y vacunas', () => {
  it('distingue vacunas por sus campos estructurados', () => {
    const records = treatmentHistory([{ id:'v',profileId:'p',kind:'medicine',title:'Registro',detail:'',occurredAt:'2026-01-01',source:'parent',data:{vaccine:'BCG'} }], 'p');
    expect(records[0]).toMatchObject({ type:'vaccine', name:'BCG' });
  });
  it('señala campos ausentes sin calcular una dosis', () => {
    const record = treatmentHistory([{ id:'m',profileId:'p',kind:'medicine',title:'Medicamento',detail:'',occurredAt:'2026-01-01',source:'parent',data:{medicine:'Ejemplo'} }], 'p')[0];
    expect(treatmentCompleteness(record).missing).toEqual(['dosis administrada','vía']);
  });
  it('separa estrictamente por perfil', () => {
    const records = treatmentHistory([{ id:'m',profileId:'otro',kind:'medicine',title:'Medicamento',detail:'',occurredAt:'2026-01-01',source:'parent' }], 'p');
    expect(records).toEqual([]);
  });
});
