import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { canCancelErasure, confirmationPhraseFor } from '../src/lib/dataErasure';

vi.mock('../src/lib/supabase', () => ({ supabase: null }));

describe('Eliminación recuperable de datos', () => {
  it('exige frases distintas y explícitas según el alcance', () => {
    expect(confirmationPhraseFor('account')).toBe('ELIMINAR MI CUENTA');
    expect(confirmationPhraseFor('family')).toBe('ELIMINAR MI FAMILIA');
    expect(confirmationPhraseFor('profile')).toBe('ELIMINAR PERFIL');
  });

  it('permite cancelar únicamente antes del procesamiento', () => {
    expect(canCancelErasure({ status: 'pending' })).toBe(true);
    expect(canCancelErasure({ status: 'processing' })).toBe(false);
    expect(canCancelErasure({ status: 'completed' })).toBe(false);
    expect(canCancelErasure({ status: 'cancelled' })).toBe(false);
  });

  it('mantiene el borrado directo fuera del cliente y protege al trabajador', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/013_data_erasure_workflow.sql'), 'utf8');
    const worker = readFileSync(resolve(process.cwd(), 'supabase/functions/data-erasure-worker/index.ts'), 'utf8');
    expect(migration).toContain("drop policy if exists \"owners request deletion\"");
    expect(migration).toContain("interval '7 days'");
    expect(migration).toContain('recent authentication required');
    expect(migration).toContain('erasure_receipts');
    expect(worker).toContain("x-worker-secret");
    expect(worker).toContain("medical-documents");
    expect(worker).toContain("consultation-reports");
  });
});
