import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { documents as initialDocuments, initialEvents, profiles as initialProfiles } from '@/data/demo';
import { makeProfileId } from '@/lib/profiles';
import { SyncChangeRef, SyncConflict, syncKey, syncValueFingerprint, workspaceSyncBaseline } from '@/lib/syncConflicts';
import { BirthRecord, Caregiver, ConsultationQuestion, ConsentPreferences, ConsentPurpose, DocumentRecord, EventKind, FamilyEvent, FamilyProfile, PostpartumRecord, PrenatalRecord } from '@/types/domain';

export type TimedKind = 'feeding' | 'sleep';

export interface ActiveSession {
  kind: TimedKind;
  startedAt: string;
  label: string;
}

export interface PendingWorkspaceSync {
  revision: number;
  changeCount: number;
  queuedAt: string;
  updatedAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  items: SyncChangeRef[];
}

interface AppState {
  workspaceIdentity: string;
  activeProfileId: string;
  profiles: FamilyProfile[];
  caregivers: Caregiver[];
  prenatalRecords: Record<string, PrenatalRecord>;
  birthRecords: Record<string, BirthRecord>;
  postpartumRecords: Record<string, PostpartumRecord>;
  consentPreferences: ConsentPreferences;
  profileNames: Record<string, string>;
  caregiverName: string;
  hasCompletedOnboarding: boolean;
  events: FamilyEvent[];
  documents: DocumentRecord[];
  activeSessions: Partial<Record<TimedKind, ActiveSession>>;
  dismissedNoticeIds: string[];
  consultationQuestions: ConsultationQuestion[];
  deletedEventIds: string[];
  deletedQuestionIds: string[];
  pendingSync?: PendingWorkspaceSync;
  syncBaseline: Record<string, string>;
  syncConflicts: SyncConflict[];
  lastRemovedEvent?: FamilyEvent;
  lastAddedEventId?: string;
  prepareWorkspace: (identity: string, ownerName?: string) => void;
  hydrateCloudWorkspace: (
    profiles: FamilyProfile[], events: FamilyEvent[], caregivers?: Caregiver[], documents?: DocumentRecord[],
    prenatalRecords?: Record<string, PrenatalRecord>, birthRecords?: Record<string, BirthRecord>,
    postpartumRecords?: Record<string, PostpartumRecord>, consultationQuestions?: ConsultationQuestion[]
  ) => void;
  setActiveProfile: (id: string) => void;
  addProfile: (profile: Omit<FamilyProfile, 'id' | 'createdAt' | 'avatar'>) => string;
  addCaregiver: (name: string, relationship: string, accessLevel?: 'viewer' | 'editor') => void;
  setCaregiverProfileAccess: (caregiverId: string, profileId: string, access?: 'viewer' | 'editor' | 'manager') => void;
  removeCaregiver: (caregiverId: string) => void;
  updatePrenatalRecord: (profileId: string, changes: Partial<Omit<PrenatalRecord, 'profileId' | 'updatedAt'>>) => void;
  updateBirthRecord: (profileId: string, changes: Partial<Omit<BirthRecord, 'profileId' | 'updatedAt'>>) => void;
  updatePostpartumRecord: (profileId: string, changes: Partial<Omit<PostpartumRecord, 'profileId' | 'updatedAt'>>) => void;
  setConsentPreference: (purpose: ConsentPurpose, granted: boolean) => void;
  completeOnboarding: (profileId: string, profileName: string, caregiverName?: string) => void;
  addQuickEvent: (kind: EventKind, title: string, detail: string, occurredAt?: string, value?: number, unit?: string, data?: FamilyEvent['data']) => string;
  addDocument: (document: Omit<DocumentRecord, 'id' | 'profileId'>) => string;
  updateDocument: (id: string, changes: Partial<Pick<DocumentRecord, 'category' | 'status' | 'extracted' | 'analysisStatus' | 'extractedFields' | 'analysisMethod' | 'analysisRequestedAt' | 'analysisConsentedAt' | 'uri' | 'localOnly' | 'cloudId' | 'storagePath' | 'uploadStatus' | 'processingJobId'>>) => void;
  removeDocument: (id: string) => void;
  updateEvent: (id: string, changes: Partial<Pick<FamilyEvent, 'title' | 'detail' | 'occurredAt' | 'value' | 'unit' | 'data'>>) => void;
  deleteEvent: (id: string) => void;
  undoDelete: () => void;
  undoLastAdd: () => void;
  startSession: (kind: TimedKind, label: string) => void;
  finishSession: (kind: TimedKind) => void;
  cancelSession: (kind: TimedKind) => void;
  dismissNotice: (id: string) => void;
  restoreNotice: (id: string) => void;
  addConsultationQuestion: (text: string) => string | undefined;
  toggleConsultationQuestion: (id: string) => void;
  removeConsultationQuestion: (id: string) => void;
  markSyncPending: (items?: SyncChangeRef[]) => void;
  markSyncAttempt: () => number | undefined;
  markSyncFailed: (revision: number, message?: string) => void;
  markSyncComplete: (revision: number) => void;
  setSyncConflicts: (conflicts: SyncConflict[]) => void;
  resolveSyncConflict: (key: string, resolution: 'local' | 'cloud') => void;
}

const minutesBetween = (start: string, end: string) => Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));

export const useAppStore = create<AppState>()(persist((set, get) => ({
  workspaceIdentity: 'demo',
  activeProfileId: 'emilia',
  profiles: initialProfiles,
  caregivers: [{ id: 'caregiver-admin', name: 'Kevin', relationship: 'Administrador familiar', access: 'admin', profileAccess: { emilia: 'manager', pregnancy: 'manager' } }],
  prenatalRecords: { pregnancy: { profileId: 'pregnancy', planningStarted: '2026-01-05', lastMenstrualPeriod: '2026-02-01', dueDate: '2026-11-08', dueDateConfirmedBy: 'Ultrasonido', folicAcidStarted: '2026-01-12', supplements: 'Multivitamínico prenatal', primaryProfessional: 'Ginecología y obstetricia', updatedAt: '2026-07-15T00:00:00.000Z' } },
  birthRecords: {},
  postpartumRecords: {},
  consentPreferences: { localStorage: true, documentAnalysis: false, aiAssistant: false, voice: false, productAnalytics: false },
  profileNames: { emilia: 'Emilia', pregnancy: 'Embarazo' },
  caregiverName: '',
  hasCompletedOnboarding: false,
  events: initialEvents,
  documents: initialDocuments,
  activeSessions: {},
  dismissedNoticeIds: [],
  consultationQuestions: [],
  deletedEventIds: [],
  deletedQuestionIds: [],
  pendingSync: undefined,
  syncBaseline: {},
  syncConflicts: [],
  prepareWorkspace: (identity, ownerName = '') => set((state): Partial<AppState> => {
    if (state.workspaceIdentity === identity) return state;
    if (identity === 'demo') return {
      workspaceIdentity: 'demo', activeProfileId: 'emilia', profiles: initialProfiles,
      caregivers: [{ id: 'caregiver-admin', name: 'Kevin', relationship: 'Administrador familiar', access: 'admin', profileAccess: { emilia: 'manager', pregnancy: 'manager' } }],
      prenatalRecords: { pregnancy: { profileId: 'pregnancy', planningStarted: '2026-01-05', lastMenstrualPeriod: '2026-02-01', dueDate: '2026-11-08', dueDateConfirmedBy: 'Ultrasonido', folicAcidStarted: '2026-01-12', supplements: 'Multivitamínico prenatal', primaryProfessional: 'Ginecología y obstetricia', updatedAt: '2026-07-15T00:00:00.000Z' } },
      birthRecords: {}, postpartumRecords: {}, consentPreferences: { localStorage: true, documentAnalysis: false, aiAssistant: false, voice: false, productAnalytics: false },
      profileNames: { emilia: 'Emilia', pregnancy: 'Embarazo' }, caregiverName: '', hasCompletedOnboarding: false,
      events: initialEvents, documents: initialDocuments, activeSessions: {}, dismissedNoticeIds: [], consultationQuestions: [], deletedEventIds: [], deletedQuestionIds: [], pendingSync: undefined, syncBaseline: {}, syncConflicts: [], lastRemovedEvent: undefined, lastAddedEventId: undefined
    };
    return {
      workspaceIdentity: identity, activeProfileId: '', profiles: [], caregivers: [{ id: `owner-${identity}`, name: ownerName || 'Mi cuenta', relationship: 'Administrador familiar', access: 'admin', profileAccess: {} }],
      prenatalRecords: {}, birthRecords: {}, postpartumRecords: {}, consentPreferences: { localStorage: true, documentAnalysis: false, aiAssistant: false, voice: false, productAnalytics: false },
      profileNames: {}, caregiverName: ownerName, hasCompletedOnboarding: false, events: [], documents: [], activeSessions: {}, dismissedNoticeIds: [], consultationQuestions: [], deletedEventIds: [], deletedQuestionIds: [], pendingSync: undefined, syncBaseline: {}, syncConflicts: [], lastRemovedEvent: undefined, lastAddedEventId: undefined
    };
  }),
  hydrateCloudWorkspace: (profiles, events, caregivers, documents, prenatalRecords, birthRecords, postpartumRecords, consultationQuestions) => set((state) => {
    const keepLocal = Boolean(state.pendingSync);
    const pendingKeys = new Set(state.pendingSync?.items?.map((item) => syncKey(item.entity, item.id)) ?? [syncKey('workspace', '*')]);
    const keepWholeWorkspace = pendingKeys.has(syncKey('workspace', '*'));
    const mergeById = <T extends { id: string }>(entity: SyncChangeRef['entity'], cloud: T[], local: T[]) => {
      const merged = new Map(cloud.map((item) => [item.id, item]));
      for (const item of local) if (keepWholeWorkspace || pendingKeys.has(syncKey(entity, item.id))) merged.set(item.id, item);
      return [...merged.values()];
    };
    const mergeRecords = <T,>(entity: SyncChangeRef['entity'], cloud: Record<string, T>, local: Record<string, T>) => {
      const merged = { ...cloud };
      for (const [id, value] of Object.entries(local)) if (keepWholeWorkspace || pendingKeys.has(syncKey(entity, id))) merged[id] = value;
      return merged;
    };
    const nextProfiles = keepLocal ? mergeById('profile', profiles, state.profiles) : profiles;
    const nextEvents = (keepLocal ? mergeById('event', events, state.events) : events).filter((event) => !state.deletedEventIds.includes(event.id));
    const cloudQuestions = consultationQuestions ?? [];
    const nextQuestions = (keepLocal ? mergeById('question', cloudQuestions, state.consultationQuestions) : cloudQuestions)
      .filter((question) => !state.deletedQuestionIds.includes(question.id));
    const profileNames = Object.fromEntries(nextProfiles.map((profile) => [profile.id, profile.name]));
    const activeProfileId = nextProfiles.some((profile) => profile.id === state.activeProfileId) ? state.activeProfileId : nextProfiles[0]?.id ?? '';
    const cloudPrenatal = prenatalRecords ?? {};
    const cloudBirth = birthRecords ?? {};
    const cloudPostpartum = postpartumRecords ?? {};
    return {
      profiles: nextProfiles, events: nextEvents, ...(caregivers?.length ? { caregivers } : {}), ...(documents ? { documents } : {}),
      prenatalRecords: keepLocal ? mergeRecords('prenatal', cloudPrenatal, state.prenatalRecords) : cloudPrenatal,
      birthRecords: keepLocal ? mergeRecords('birth', cloudBirth, state.birthRecords) : cloudBirth,
      postpartumRecords: keepLocal ? mergeRecords('postpartum', cloudPostpartum, state.postpartumRecords) : cloudPostpartum,
      consultationQuestions: nextQuestions,
      syncBaseline: workspaceSyncBaseline({ profiles, events, prenatalRecords: cloudPrenatal, birthRecords: cloudBirth, postpartumRecords: cloudPostpartum, consultationQuestions: cloudQuestions }),
      profileNames, activeProfileId, hasCompletedOnboarding: nextProfiles.length > 0
    };
  }),
  setActiveProfile: (activeProfileId) => set({ activeProfileId }),
  addProfile: (profile) => {
    const id = makeProfileId(profile.name);
    const next = { ...profile, id, avatar: profile.stage === 'pregnancy' ? '♡' : profile.name.trim().charAt(0).toUpperCase(), createdAt: new Date().toISOString() };
    set((state) => ({ profiles: [...state.profiles, next], profileNames: { ...state.profileNames, [id]: next.name }, activeProfileId: id }));
    return id;
  },
  addCaregiver: (name, relationship, accessLevel = 'editor') => set((state) => ({ caregivers: [...state.caregivers, { id: `caregiver-${Date.now().toString(36)}`, name: name.trim(), relationship: relationship.trim() || 'Cuidador familiar', access: 'caregiver', profileAccess: { [state.activeProfileId]: accessLevel } }] })),
  setCaregiverProfileAccess: (caregiverId, profileId, access) => set((state) => ({ caregivers: state.caregivers.map((caregiver) => {
    if (caregiver.id !== caregiverId || caregiver.access === 'admin') return caregiver;
    const profileAccess = { ...(caregiver.profileAccess ?? {}) };
    if (access) profileAccess[profileId] = access; else delete profileAccess[profileId];
    return { ...caregiver, profileAccess };
  }) })),
  removeCaregiver: (caregiverId) => set((state) => ({ caregivers: state.caregivers.filter((caregiver) => caregiver.id !== caregiverId || caregiver.access === 'admin') })),
  updatePrenatalRecord: (profileId, changes) => set((state) => ({
    prenatalRecords: { ...state.prenatalRecords, [profileId]: { ...(state.prenatalRecords[profileId] ?? { profileId }), ...changes, profileId, updatedAt: new Date().toISOString() } },
    profiles: changes.dueDate ? state.profiles.map((profile) => profile.id === profileId ? { ...profile, dueDate: changes.dueDate } : profile) : state.profiles
  })),
  updateBirthRecord: (profileId, changes) => set((state) => ({ birthRecords: { ...state.birthRecords, [profileId]: { ...(state.birthRecords[profileId] ?? { profileId }), ...changes, profileId, updatedAt: new Date().toISOString() } } })),
  updatePostpartumRecord: (profileId, changes) => set((state) => ({ postpartumRecords: { ...state.postpartumRecords, [profileId]: { ...(state.postpartumRecords[profileId] ?? { profileId }), ...changes, profileId, updatedAt: new Date().toISOString() } } })),
  setConsentPreference: (purpose, granted) => set((state) => ({ consentPreferences: { ...state.consentPreferences, [purpose]: granted } })),
  completeOnboarding: (activeProfileId, profileName, caregiverName = '') => set((state) => ({
    activeProfileId,
    profileNames: { ...state.profileNames, [activeProfileId]: profileName.trim() || state.profileNames[activeProfileId] },
    profiles: state.profiles.map((profile) => profile.id === activeProfileId ? { ...profile, name: profileName.trim() || profile.name, avatar: profileName.trim().charAt(0).toUpperCase() || profile.avatar } : profile),
    caregiverName: caregiverName.trim(),
    hasCompletedOnboarding: true
  })),
  addQuickEvent: (kind, title, detail, occurredAt = new Date().toISOString(), value, unit, data) => {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      events: [{ id, profileId: state.activeProfileId, kind, title, detail, occurredAt, source: 'parent', value, unit, data }, ...state.events],
      lastRemovedEvent: undefined,
      lastAddedEventId: id
    }));
    return id;
  },
  addDocument: (document) => {
    const id = `document-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ documents: [{ ...document, id, profileId: state.activeProfileId }, ...state.documents] }));
    return id;
  },
  updateDocument: (id, changes) => set((state) => ({ documents: state.documents.map((document) => document.id === id ? { ...document, ...changes } : document) })),
  removeDocument: (id) => set((state) => ({ documents: state.documents.filter((document) => document.id !== id) })),
  updateEvent: (id, changes) => set((state) => ({ events: state.events.map((event) => event.id === id ? { ...event, ...changes } : event) })),
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter((event) => event.id !== id),
    deletedEventIds: state.deletedEventIds.includes(id) ? state.deletedEventIds : [...state.deletedEventIds, id],
    lastRemovedEvent: state.events.find((event) => event.id === id),
    lastAddedEventId: undefined
  })),
  undoDelete: () => set((state) => state.lastRemovedEvent ? ({
    events: [state.lastRemovedEvent, ...state.events].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
    deletedEventIds: state.deletedEventIds.filter((id) => id !== state.lastRemovedEvent?.id),
    lastRemovedEvent: undefined
  }) : state),
  undoLastAdd: () => set((state) => state.lastAddedEventId ? ({
    events: state.events.filter((event) => event.id !== state.lastAddedEventId),
    lastAddedEventId: undefined
  }) : state),
  startSession: (kind, label) => set((state) => ({ activeSessions: { ...state.activeSessions, [kind]: { kind, label, startedAt: new Date().toISOString() } } })),
  finishSession: (kind) => {
    const session = get().activeSessions[kind];
    if (!session) return;
    const endedAt = new Date().toISOString();
    const duration = minutesBetween(session.startedAt, endedAt);
    get().addQuickEvent(kind, kind === 'feeding' ? 'Lactancia' : 'Sueño', `${session.label} · ${duration} min`, session.startedAt, duration, 'min');
    set((state) => ({ activeSessions: { ...state.activeSessions, [kind]: undefined } }));
  },
  cancelSession: (kind) => set((state) => ({ activeSessions: { ...state.activeSessions, [kind]: undefined } })),
  dismissNotice: (id) => set((state) => ({ dismissedNoticeIds: state.dismissedNoticeIds.includes(id) ? state.dismissedNoticeIds : [...state.dismissedNoticeIds, id] })),
  restoreNotice: (id) => set((state) => ({ dismissedNoticeIds: state.dismissedNoticeIds.filter((noticeId) => noticeId !== id) })),
  addConsultationQuestion: (text) => {
    const clean = text.trim().slice(0, 500);
    if (!clean) return undefined;
    const id = `question-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ consultationQuestions: [{ id, profileId: state.activeProfileId, text: clean, createdAt: new Date().toISOString() }, ...state.consultationQuestions] }));
    return id;
  },
  toggleConsultationQuestion: (id) => set((state) => ({ consultationQuestions: state.consultationQuestions.map((question) => question.id === id ? { ...question, resolvedAt: question.resolvedAt ? undefined : new Date().toISOString() } : question) })),
  removeConsultationQuestion: (id) => set((state) => ({
    consultationQuestions: state.consultationQuestions.filter((question) => question.id !== id),
    deletedQuestionIds: state.deletedQuestionIds.includes(id) ? state.deletedQuestionIds : [...state.deletedQuestionIds, id]
  })),
  markSyncPending: (items = [{ entity: 'workspace', id: '*', operation: 'upsert' }]) => set((state) => {
    const now = new Date().toISOString();
    const mergedItems = new Map((state.pendingSync?.items ?? []).map((item) => [syncKey(item.entity, item.id), item]));
    for (const item of items) mergedItems.set(syncKey(item.entity, item.id), item);
    const nextItems = [...mergedItems.values()];
    return { pendingSync: state.pendingSync ? {
      ...state.pendingSync,
      revision: state.pendingSync.revision + 1,
      changeCount: nextItems.length,
      updatedAt: now,
      lastError: undefined,
      items: nextItems
    } : { revision: 1, changeCount: nextItems.length, queuedAt: now, updatedAt: now, attempts: 0, items: nextItems } };
  }),
  markSyncAttempt: () => {
    const pending = get().pendingSync;
    if (!pending) return undefined;
    const revision = pending.revision;
    set((state) => state.pendingSync ? ({ pendingSync: {
      ...state.pendingSync,
      attempts: state.pendingSync.attempts + 1,
      lastAttemptAt: new Date().toISOString()
    } }) : state);
    return revision;
  },
  markSyncFailed: (revision, message = 'No fue posible conectar') => set((state) => state.pendingSync && state.pendingSync.revision >= revision ? ({
    pendingSync: { ...state.pendingSync, lastError: message }
  }) : state),
  markSyncComplete: (revision) => set((state) => state.pendingSync?.revision === revision ? ({
    pendingSync: undefined,
    deletedEventIds: [],
    deletedQuestionIds: [],
    syncConflicts: [],
    syncBaseline: workspaceSyncBaseline(state)
  }) : state),
  setSyncConflicts: (syncConflicts) => set({ syncConflicts }),
  resolveSyncConflict: (key, resolution) => set((state) => {
    const conflict = state.syncConflicts.find((item) => item.key === key);
    if (!conflict) return state;
    const nextBaseline = { ...state.syncBaseline };
    if (conflict.cloudValue === null) delete nextBaseline[key];
    else nextBaseline[key] = syncValueFingerprint(conflict.entity, conflict.cloudValue);
    const next: Partial<AppState> = {
      syncConflicts: state.syncConflicts.filter((item) => item.key !== key),
      syncBaseline: nextBaseline
    };
    if (resolution === 'cloud') {
      const replaceById = <T extends { id: string }>(items: T[]) => conflict.cloudValue === null
        ? items.filter((item) => item.id !== conflict.id)
        : [...items.filter((item) => item.id !== conflict.id), conflict.cloudValue as T];
      if (conflict.entity === 'profile') next.profiles = replaceById(state.profiles);
      if (conflict.entity === 'event') next.events = replaceById(state.events);
      if (conflict.entity === 'question') next.consultationQuestions = replaceById(state.consultationQuestions);
      if (conflict.entity === 'prenatal') next.prenatalRecords = { ...state.prenatalRecords, [conflict.id]: conflict.cloudValue as PrenatalRecord };
      if (conflict.entity === 'birth') next.birthRecords = { ...state.birthRecords, [conflict.id]: conflict.cloudValue as BirthRecord };
      if (conflict.entity === 'postpartum') next.postpartumRecords = { ...state.postpartumRecords, [conflict.id]: conflict.cloudValue as PostpartumRecord };
      if (conflict.cloudValue === null) {
        if (conflict.entity === 'prenatal') { next.prenatalRecords = { ...state.prenatalRecords }; delete next.prenatalRecords[conflict.id]; }
        if (conflict.entity === 'birth') { next.birthRecords = { ...state.birthRecords }; delete next.birthRecords[conflict.id]; }
        if (conflict.entity === 'postpartum') { next.postpartumRecords = { ...state.postpartumRecords }; delete next.postpartumRecords[conflict.id]; }
      }
      const items = state.pendingSync?.items.filter((item) => syncKey(item.entity, item.id) !== key) ?? [];
      next.pendingSync = state.pendingSync ? (items.length ? { ...state.pendingSync, revision: state.pendingSync.revision + 1, changeCount: items.length, items } : undefined) : undefined;
      if (conflict.entity === 'event') next.deletedEventIds = state.deletedEventIds.filter((id) => id !== conflict.id);
      if (conflict.entity === 'question') next.deletedQuestionIds = state.deletedQuestionIds.filter((id) => id !== conflict.id);
    }
    return next;
  })
}), {
  name: 'emilia-family-state-v2',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    workspaceIdentity: state.workspaceIdentity,
    activeProfileId: state.activeProfileId,
    profiles: state.profiles,
    caregivers: state.caregivers,
    prenatalRecords: state.prenatalRecords,
    birthRecords: state.birthRecords,
    postpartumRecords: state.postpartumRecords,
    consentPreferences: state.consentPreferences,
    profileNames: state.profileNames,
    caregiverName: state.caregiverName,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    events: state.events,
    documents: state.documents,
    activeSessions: state.activeSessions,
    dismissedNoticeIds: state.dismissedNoticeIds,
    consultationQuestions: state.consultationQuestions,
    deletedEventIds: state.deletedEventIds,
    deletedQuestionIds: state.deletedQuestionIds,
    pendingSync: state.pendingSync,
    syncBaseline: state.syncBaseline,
    syncConflicts: state.syncConflicts
  })
}));
