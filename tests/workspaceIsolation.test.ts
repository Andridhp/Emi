import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined), removeItem: vi.fn(async () => undefined) }
}));

import { useAppStore } from '../src/store/useAppStore';

describe('aislamiento del espacio familiar', () => {
  afterEach(() => useAppStore.getState().prepareWorkspace('demo'));

  it('no entrega los datos demo a una cuenta real', () => {
    useAppStore.getState().prepareWorkspace('user:cuenta-a', 'Ana');
    const state = useAppStore.getState();
    expect(state.workspaceIdentity).toBe('user:cuenta-a');
    expect(state.profiles).toEqual([]);
    expect(state.events).toEqual([]);
    expect(state.documents).toEqual([]);
    expect(state.prenatalRecords).toEqual({});
    expect(state.birthRecords).toEqual({});
    expect(state.postpartumRecords).toEqual({});
    expect(state.consultationQuestions).toEqual([]);
    expect(state.caregivers[0].name).toBe('Ana');
  });

  it('separa dos cuentas usadas en el mismo dispositivo', () => {
    useAppStore.getState().prepareWorkspace('user:cuenta-a', 'Ana');
    useAppStore.getState().addProfile({ name: 'Bebé A', stage: 'child' });
    expect(useAppStore.getState().profiles).toHaveLength(1);
    useAppStore.getState().prepareWorkspace('user:cuenta-b', 'Bea');
    expect(useAppStore.getState().profiles).toEqual([]);
    expect(useAppStore.getState().caregiverName).toBe('Bea');
  });

  it('restaura el recorrido ficticio al entrar a demostración', () => {
    useAppStore.getState().prepareWorkspace('user:cuenta-a', 'Ana');
    useAppStore.getState().prepareWorkspace('demo');
    expect(useAppStore.getState().profiles.some((profile) => profile.id === 'emilia')).toBe(true);
    expect(useAppStore.getState().events.length).toBeGreaterThan(0);
  });

  it('conserva una eliminación de pregunta al hidratar desde la nube', () => {
    useAppStore.getState().prepareWorkspace('user:cuenta-a', 'Ana');
    const profileId = useAppStore.getState().addProfile({ name: 'Bebé A', stage: 'child' });
    const deletedId = useAppStore.getState().addConsultationQuestion('¿Qué debemos vigilar?');
    expect(deletedId).toBeTruthy();
    useAppStore.getState().removeConsultationQuestion(deletedId!);

    useAppStore.getState().hydrateCloudWorkspace(
      useAppStore.getState().profiles,
      [],
      undefined,
      [],
      {},
      {},
      {},
      [
        { id: deletedId!, profileId, text: '¿Qué debemos vigilar?', createdAt: '2026-07-30T10:00:00.000Z' },
        { id: 'question-cloud', profileId, text: '¿Cuándo es la siguiente revisión?', createdAt: '2026-07-30T11:00:00.000Z' }
      ]
    );

    expect(useAppStore.getState().deletedQuestionIds).toContain(deletedId);
    expect(useAppStore.getState().consultationQuestions.map((question) => question.id)).toEqual(['question-cloud']);
  });

  it('no confirma por error un cambio que apareció durante la sincronización', () => {
    useAppStore.getState().prepareWorkspace('user:cuenta-a', 'Ana');
    useAppStore.getState().markSyncPending();
    const firstRevision = useAppStore.getState().markSyncAttempt();
    expect(firstRevision).toBe(1);

    useAppStore.getState().markSyncPending();
    useAppStore.getState().markSyncComplete(firstRevision!);
    expect(useAppStore.getState().pendingSync?.revision).toBe(2);

    useAppStore.getState().markSyncComplete(2);
    expect(useAppStore.getState().pendingSync).toBeUndefined();
  });

  it('preserva el registro local pendiente al cargar una versión de nube', () => {
    useAppStore.getState().prepareWorkspace('user:cuenta-a', 'Ana');
    const profileId = useAppStore.getState().addProfile({ name: 'Bebé A', stage: 'child' });
    useAppStore.getState().addQuickEvent('sleep', 'Sueño local', 'Cambio sin conexión');
    useAppStore.getState().markSyncPending();
    const localEvent = useAppStore.getState().events[0];

    useAppStore.getState().hydrateCloudWorkspace(
      useAppStore.getState().profiles,
      [
        { ...localEvent, title: 'Versión antigua en nube' },
        { id: 'cloud-extra', profileId, kind: 'feeding', title: 'Registro remoto', detail: '', occurredAt: '2026-07-30T12:00:00.000Z', source: 'parent' }
      ]
    );

    expect(useAppStore.getState().events.find((event) => event.id === localEvent.id)?.title).toBe('Sueño local');
    expect(useAppStore.getState().events.some((event) => event.id === 'cloud-extra')).toBe(true);
  });

  it('aplica la versión de nube elegida y retira ese cambio de la cola', () => {
    useAppStore.getState().prepareWorkspace('user:cuenta-a', 'Ana');
    const profileId = useAppStore.getState().addProfile({ name: 'Bebé A', stage: 'child' });
    const eventId = useAppStore.getState().addQuickEvent('sleep', 'Sueño local', '55 min');
    useAppStore.getState().markSyncPending([{ entity: 'event', id: eventId, operation: 'upsert' }]);
    const localValue = useAppStore.getState().events.find((event) => event.id === eventId)!;
    const cloudValue = { ...localValue, profileId, title: 'Sueño de nube', detail: '50 min' };
    useAppStore.getState().setSyncConflicts([{
      key: `event:${eventId}`, entity: 'event', id: eventId, detectedAt: '2026-07-30T12:00:00.000Z', localValue, cloudValue
    }]);

    useAppStore.getState().resolveSyncConflict(`event:${eventId}`, 'cloud');
    expect(useAppStore.getState().events.find((event) => event.id === eventId)?.title).toBe('Sueño de nube');
    expect(useAppStore.getState().pendingSync).toBeUndefined();
    expect(useAppStore.getState().syncConflicts).toEqual([]);
  });
});
