import { describe, expect, it } from 'vitest';
import { deriveOperationalNotices } from '../src/lib/notices';

describe('Centro de avisos', () => {
  it('muestra tareas documentales solo para el perfil activo', () => {
    const notices = deriveOperationalNotices({ profileId: 'a', events: [], activeSessions: {}, documents: [
      { id: 'a1', profileId: 'a', name: 'Laboratorio.pdf', category: 'Laboratorio', date: '', status: 'pending', extracted: [] },
      { id: 'b1', profileId: 'b', name: 'Otro.pdf', category: 'Otro', date: '', status: 'pending', extracted: [] }
    ], now: new Date('2026-07-24') });
    expect(notices.map((notice) => notice.id)).toEqual(['document-a1']);
  });

  it('prioriza registros en curso y calcula un tiempo comprensible', () => {
    const notices = deriveOperationalNotices({ profileId: 'a', events: [], documents: [], activeSessions: { sleep: { kind: 'sleep', label: 'Durmiendo', startedAt: '2026-07-24T10:00:00Z' } }, now: new Date('2026-07-24T10:12:00Z') });
    expect(notices[0].body).toContain('12 min');
    expect(notices[0].href).toBe('/track/sleep');
  });

  it('no convierte síntomas ni promedios en alertas clínicas', () => {
    const notices = deriveOperationalNotices({ profileId: 'a', documents: [], activeSessions: {}, events: [{ id: 's', profileId: 'a', kind: 'symptom', title: 'Nota', detail: 'texto libre', occurredAt: '2026-07-24T10:00:00Z', source: 'parent' }], now: new Date('2026-07-24T12:00:00Z') });
    expect(notices).toEqual([]);
  });
});
