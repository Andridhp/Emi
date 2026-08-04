import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { protectedReportShareUrl } from '../src/lib/cloudReports';

describe('Enlaces protegidos para reportes', () => {
  it('mantiene el token fuera de la petición HTTP inicial', () => {
    const token = 'a'.repeat(64);
    const url = protectedReportShareUrl('https://example.supabase.co/', token);
    expect(url).toBe(`https://example.supabase.co/functions/v1/report-share#${token}`);
    expect(url).not.toContain('?token=');
  });
});
