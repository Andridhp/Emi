import type { BirthRecord, ConsultationQuestion, FamilyEvent, FamilyProfile, PostpartumRecord, PrenatalRecord } from '@/types/domain';

export type SyncEntityKind = 'profile' | 'event' | 'prenatal' | 'birth' | 'postpartum' | 'question' | 'workspace';
export type SyncOperation = 'upsert' | 'delete';

export interface SyncChangeRef {
  entity: SyncEntityKind;
  id: string;
  operation: SyncOperation;
}

export interface SyncConflict {
  key: string;
  entity: Exclude<SyncEntityKind, 'workspace'>;
  id: string;
  detectedAt: string;
  localValue: unknown;
  cloudValue: unknown;
}

export interface SyncWorkspaceData {
  profiles: FamilyProfile[];
  events: FamilyEvent[];
  prenatalRecords: Record<string, PrenatalRecord>;
  birthRecords: Record<string, BirthRecord>;
  postpartumRecords: Record<string, PostpartumRecord>;
  consultationQuestions: ConsultationQuestion[];
}

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)])
  );
  return value;
};

export const syncFingerprint = (value: unknown) => JSON.stringify(canonical(value));
export const syncKey = (entity: SyncEntityKind, id: string) => `${entity}:${id}`;

export const syncValueFingerprint = (entity: SyncEntityKind, value: unknown) => {
  if (entity === 'profile' && value && typeof value === 'object') {
    const { avatar: _avatar, createdAt: _createdAt, ...semanticProfile } = value as Record<string, unknown>;
    return syncFingerprint(semanticProfile);
  }
  return syncFingerprint(value);
};

export function workspaceSyncSnapshot(data: SyncWorkspaceData): Record<string, unknown> {
  return {
    ...Object.fromEntries(data.profiles.map((item) => [syncKey('profile', item.id), item])),
    ...Object.fromEntries(data.events.map((item) => [syncKey('event', item.id), item])),
    ...Object.fromEntries(Object.entries(data.prenatalRecords).map(([id, item]) => [syncKey('prenatal', id), item])),
    ...Object.fromEntries(Object.entries(data.birthRecords).map(([id, item]) => [syncKey('birth', id), item])),
    ...Object.fromEntries(Object.entries(data.postpartumRecords).map(([id, item]) => [syncKey('postpartum', id), item])),
    ...Object.fromEntries(data.consultationQuestions.map((item) => [syncKey('question', item.id), item]))
  };
}

export function workspaceSyncBaseline(data: SyncWorkspaceData): Record<string, string> {
  return Object.fromEntries(Object.entries(workspaceSyncSnapshot(data)).map(([key, value]) => [key, syncValueFingerprint(key.split(':')[0] as SyncEntityKind, value)]));
}

const changedIds = <T extends { id: string }>(entity: SyncEntityKind, current: T[], previous: T[]) => {
  const currentById = new Map(current.map((item) => [item.id, item]));
  const previousById = new Map(previous.map((item) => [item.id, item]));
  const refs: SyncChangeRef[] = [];
  for (const [id, item] of currentById) {
    if (!previousById.has(id) || syncValueFingerprint(entity, item) !== syncValueFingerprint(entity, previousById.get(id))) refs.push({ entity, id, operation: 'upsert' });
  }
  for (const id of previousById.keys()) if (!currentById.has(id)) refs.push({ entity, id, operation: 'delete' });
  return refs;
};

const changedRecordIds = <T>(entity: SyncEntityKind, current: Record<string, T>, previous: Record<string, T>) => {
  const ids = new Set([...Object.keys(current), ...Object.keys(previous)]);
  return [...ids].flatMap<SyncChangeRef>((id) => {
    if (!(id in current)) return [{ entity, id, operation: 'delete' }];
    if (!(id in previous) || syncFingerprint(current[id]) !== syncFingerprint(previous[id])) return [{ entity, id, operation: 'upsert' }];
    return [];
  });
};

export function detectWorkspaceChanges(current: SyncWorkspaceData, previous: SyncWorkspaceData): SyncChangeRef[] {
  return [
    ...changedIds('profile', current.profiles, previous.profiles),
    ...changedIds('event', current.events, previous.events),
    ...changedRecordIds('prenatal', current.prenatalRecords, previous.prenatalRecords),
    ...changedRecordIds('birth', current.birthRecords, previous.birthRecords),
    ...changedRecordIds('postpartum', current.postpartumRecords, previous.postpartumRecords),
    ...changedIds('question', current.consultationQuestions, previous.consultationQuestions)
  ];
}

export function detectSyncConflicts(
  changes: SyncChangeRef[],
  baseline: Record<string, string>,
  local: SyncWorkspaceData,
  cloud: SyncWorkspaceData
): SyncConflict[] {
  const localSnapshot = workspaceSyncSnapshot(local);
  const cloudSnapshot = workspaceSyncSnapshot(cloud);
  return changes.flatMap<SyncConflict>((change) => {
    if (change.entity === 'workspace') return [];
    const key = syncKey(change.entity, change.id);
    const localValue = localSnapshot[key];
    const cloudValue = cloudSnapshot[key];
    const baselineValue = baseline[key];
    const cloudFingerprint = cloudValue === undefined ? undefined : syncValueFingerprint(change.entity, cloudValue);
    const localFingerprint = localValue === undefined ? undefined : syncValueFingerprint(change.entity, localValue);
    const cloudChanged = baselineValue === undefined ? cloudValue !== undefined : cloudFingerprint !== baselineValue;
    if (!cloudChanged || cloudFingerprint === localFingerprint) return [];
    return [{ key, entity: change.entity, id: change.id, detectedAt: new Date().toISOString(), localValue: localValue ?? null, cloudValue: cloudValue ?? null }];
  });
}

export const syncEntityLabel = (entity: Exclude<SyncEntityKind, 'workspace'>) => ({
  profile: 'Perfil', event: 'Registro', prenatal: 'Embarazo', birth: 'Nacimiento',
  postpartum: 'Posparto', question: 'Pregunta para consulta'
})[entity];
