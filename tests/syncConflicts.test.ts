import { describe, expect, it } from 'vitest';
import { detectSyncConflicts, syncFingerprint, syncKey, workspaceSyncBaseline } from '../src/lib/syncConflicts';
import type { FamilyEvent } from '../src/types/domain';

const baseEvent: FamilyEvent = {
  id: 'event-1', profileId: 'baby', kind: 'sleep', title: 'Sueño', detail: '40 min',
  occurredAt: '2026-07-30T10:00:00.000Z', source: 'parent'
};

const workspace = (event: FamilyEvent) => ({
  profiles: [], events: [event], prenatalRecords: {}, birthRecords: {}, postpartumRecords: {}, consultationQuestions: []
});

describe('resolución preventiva de conflictos', () => {
  it('normaliza el orden de las propiedades antes de comparar', () => {
    expect(syncFingerprint({ b: 2, a: { d: 4, c: 3 } })).toBe(syncFingerprint({ a: { c: 3, d: 4 }, b: 2 }));
  });

  it('no confunde metadatos locales de presentación con una edición de perfil', () => {
    const localProfile = { id: 'baby', name: 'Emi', stage: 'child' as const, avatar: 'E', createdAt: '2026-07-30T10:00:00.000Z' };
    const cloudProfile = { ...localProfile, avatar: '♡', createdAt: '2026-07-30T10:00:01.000Z' };
    const base = { profiles: [cloudProfile], events: [], prenatalRecords: {}, birthRecords: {}, postpartumRecords: {}, consultationQuestions: [] };
    const baseline = workspaceSyncBaseline({ ...base, profiles: [] });
    const conflicts = detectSyncConflicts([{ entity: 'profile', id: 'baby', operation: 'upsert' }], baseline, { ...base, profiles: [localProfile] }, base);
    expect(conflicts).toEqual([]);
  });

  it('permite enviar cuando la nube conserva la versión base', () => {
    const baseline = workspaceSyncBaseline(workspace(baseEvent));
    const local = workspace({ ...baseEvent, detail: '55 min' });
    const conflicts = detectSyncConflicts([{ entity: 'event', id: baseEvent.id, operation: 'upsert' }], baseline, local, workspace(baseEvent));
    expect(conflicts).toEqual([]);
  });

  it('pausa cuando ambos dispositivos editaron el mismo registro', () => {
    const baseline = workspaceSyncBaseline(workspace(baseEvent));
    const local = workspace({ ...baseEvent, detail: '55 min' });
    const cloud = workspace({ ...baseEvent, detail: '50 min' });
    const [conflict] = detectSyncConflicts([{ entity: 'event', id: baseEvent.id, operation: 'upsert' }], baseline, local, cloud);
    expect(conflict.key).toBe(syncKey('event', baseEvent.id));
    expect((conflict.localValue as FamilyEvent).detail).toBe('55 min');
    expect((conflict.cloudValue as FamilyEvent).detail).toBe('50 min');
  });

  it('detecta que una eliminación local compite con una edición remota', () => {
    const baseline = workspaceSyncBaseline(workspace(baseEvent));
    const local = workspace(baseEvent); local.events = [];
    const cloud = workspace({ ...baseEvent, detail: 'Actualizado por otro cuidador' });
    const conflicts = detectSyncConflicts([{ entity: 'event', id: baseEvent.id, operation: 'delete' }], baseline, local, cloud);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].localValue).toBeNull();
  });
});
