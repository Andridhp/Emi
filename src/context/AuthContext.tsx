import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { isDemoMode as backendIsDemo, supabase } from '@/lib/supabase';
import { loadCloudWorkspace, syncCloudWorkspace } from '@/lib/cloudWorkspace';
import { useAppStore } from '@/store/useAppStore';
import { pendingInvitation } from '@/lib/invitations';
import { DOCUMENT_ANALYSIS_POLICY_VERSION, grantDocumentAnalysisConsent } from '@/lib/cloudDocuments';
import { FAMILY_INSIGHTS_POLICY_VERSION, grantAiAssistantConsent } from '@/lib/aiAssistant';
import { detectSyncConflicts, detectWorkspaceChanges } from '@/lib/syncConflicts';

const DEMO_KEY = 'emilia-demo-session-v1';

type AuthResult = { ok: boolean; message?: string; needsEmailConfirmation?: boolean; nextPath?: string };
type SyncStatus = 'local' | 'loading' | 'synced' | 'error' | 'conflict';
type AuthContextValue = {
  user: User | null;
  loading: boolean;
  demoSession: boolean;
  isAuthenticated: boolean;
  backendAvailable: boolean;
  familyId?: string;
  familyName?: string;
  syncStatus: SyncStatus;
  pendingChanges: number;
  conflictCount: number;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  enterDemo: () => Promise<void>;
  acceptEssentialConsent: () => Promise<AuthResult>;
  syncNow: () => Promise<AuthResult>;
  refreshWorkspace: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const pushCurrentWorkspace = async (targetFamilyId: string) => {
  const state = useAppStore.getState();
  await syncCloudWorkspace(
    targetFamilyId, state.profiles, state.events, state.deletedEventIds,
    state.prenatalRecords, state.birthRecords, state.postpartumRecords,
    state.consultationQuestions, state.deletedQuestionIds
  );
};

const friendlyError = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return 'El correo o la contraseña no coinciden.';
  if (lower.includes('already registered')) return 'Ya existe una cuenta con este correo.';
  if (lower.includes('password')) return 'La contraseña no cumple los requisitos de seguridad.';
  return 'No fue posible completar la solicitud. Inténtalo nuevamente.';
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [demoSession, setDemoSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string>();
  const [familyName, setFamilyName] = useState<string>();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(backendIsDemo ? 'local' : 'loading');
  const pendingSync = useAppStore((state) => state.pendingSync);
  const conflictCount = useAppStore((state) => state.syncConflicts.length);
  const hydratingRef = useRef(false);
  const internalSyncStateRef = useRef(false);
  const syncInFlightRef = useRef<Promise<boolean> | null>(null);

  const activateUserWorkspace = async (nextUser: User) => {
    useAppStore.getState().prepareWorkspace(`user:${nextUser.id}`, nextUser.user_metadata?.display_name || 'Mi cuenta');
    try {
      const workspace = await loadCloudWorkspace(nextUser);
      setFamilyId(workspace.familyId); setFamilyName(workspace.familyName);
      if (workspace.familyId) {
        hydratingRef.current = true;
        useAppStore.getState().hydrateCloudWorkspace(
          workspace.profiles, workspace.events, workspace.caregivers, workspace.documents,
          workspace.prenatalRecords, workspace.birthRecords, workspace.postpartumRecords, workspace.consultationQuestions
        );
        hydratingRef.current = false;
      }
      if (workspace.familyId) useAppStore.getState().setConsentPreference('documentAnalysis', Boolean(workspace.documentAnalysisConsent));
      if (workspace.familyId) useAppStore.getState().setConsentPreference('aiAssistant', Boolean(workspace.aiAssistantConsent));
      setSyncStatus(useAppStore.getState().syncConflicts.length ? 'conflict' : 'synced');
      return workspace;
    } catch {
      setSyncStatus('error');
      return { profiles: [], events: [], caregivers: [], documents: [], prenatalRecords: {}, birthRecords: {}, postpartumRecords: {}, consultationQuestions: [] };
    }
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(DEMO_KEY),
      supabase?.auth.getSession() ?? Promise.resolve({ data: { session: null } })
    ]).then(async ([demo, result]) => {
      if (!mounted) return;
      setDemoSession(demo === 'active');
      const sessionUser = result.data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) await activateUserWorkspace(sessionUser);
      else if (demo === 'active') useAppStore.getState().prepareWorkspace('demo');
      setLoading(false);
    });
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void activateUserWorkspace(session.user);
    }).data.subscription;
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []);

  const runQueuedSync = useCallback(async (force = false): Promise<boolean> => {
    if (!user || !familyId || demoSession || !supabase) return true;
    if (syncInFlightRef.current) return syncInFlightRef.current;
    if (useAppStore.getState().syncConflicts.length) { setSyncStatus('conflict'); return false; }
    if (force && !useAppStore.getState().pendingSync) {
      setSyncStatus('loading');
      try {
        const cloud = await loadCloudWorkspace(user);
        hydratingRef.current = true;
        useAppStore.getState().hydrateCloudWorkspace(cloud.profiles, cloud.events, cloud.caregivers, cloud.documents, cloud.prenatalRecords, cloud.birthRecords, cloud.postpartumRecords, cloud.consultationQuestions);
        hydratingRef.current = false;
        setSyncStatus('synced');
        return true;
      } catch {
        hydratingRef.current = false;
        setSyncStatus('error');
        return false;
      }
    }
    const revision = useAppStore.getState().markSyncAttempt();
    if (!revision) { setSyncStatus('synced'); return true; }

    setSyncStatus('loading');
    const operation = (async () => {
      const cloud = await loadCloudWorkspace(user);
      const current = useAppStore.getState();
      const conflicts = detectSyncConflicts(current.pendingSync?.items ?? [], current.syncBaseline, current, cloud);
      if (conflicts.length) {
        current.setSyncConflicts(conflicts);
        setSyncStatus('conflict');
        return false;
      }
      hydratingRef.current = true;
      current.hydrateCloudWorkspace(cloud.profiles, cloud.events, cloud.caregivers, cloud.documents, cloud.prenatalRecords, cloud.birthRecords, cloud.postpartumRecords, cloud.consultationQuestions);
      hydratingRef.current = false;
      await pushCurrentWorkspace(familyId);
      internalSyncStateRef.current = true;
      useAppStore.getState().markSyncComplete(revision);
      internalSyncStateRef.current = false;
      setSyncStatus(useAppStore.getState().pendingSync ? 'loading' : 'synced');
      return true;
    })().catch(() => {
      hydratingRef.current = false;
      useAppStore.getState().markSyncFailed(revision);
      setSyncStatus('error');
      return false;
    }).finally(() => {
      syncInFlightRef.current = null;
    });
    syncInFlightRef.current = operation;
    return operation;
  }, [demoSession, familyId, user]);

  useEffect(() => {
    if (!user || !familyId || demoSession) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (hydratingRef.current || internalSyncStateRef.current || state.syncConflicts !== previous.syncConflicts) return;
      if (
        state.profiles === previous.profiles && state.events === previous.events && state.deletedEventIds === previous.deletedEventIds
        && state.prenatalRecords === previous.prenatalRecords && state.birthRecords === previous.birthRecords
        && state.postpartumRecords === previous.postpartumRecords && state.consultationQuestions === previous.consultationQuestions
        && state.deletedQuestionIds === previous.deletedQuestionIds
      ) return;
      const changes = detectWorkspaceChanges(state, previous);
      if (!changes.length) return;
      if (timer) clearTimeout(timer);
      useAppStore.getState().markSyncPending(changes);
      setSyncStatus('loading');
      timer = setTimeout(() => { void runQueuedSync(); }, 900);
    });
    const retryInterval = setInterval(() => {
      if (useAppStore.getState().pendingSync) void runQueuedSync();
    }, 20000);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && useAppStore.getState().pendingSync) void runQueuedSync();
    });
    const handleOnline = () => { if (useAppStore.getState().pendingSync) void runQueuedSync(); };
    if (typeof window !== 'undefined') window.addEventListener('online', handleOnline);
    if (useAppStore.getState().pendingSync) timer = setTimeout(() => { void runQueuedSync(); }, 250);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(retryInterval);
      appStateSubscription.remove();
      if (typeof window !== 'undefined') window.removeEventListener('online', handleOnline);
      unsubscribe();
    };
  }, [demoSession, familyId, runQueuedSync, user]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, demoSession, isAuthenticated: Boolean(user || demoSession), backendAvailable: !backendIsDemo,
    familyId, familyName, syncStatus, pendingChanges: pendingSync?.changeCount ?? 0, conflictCount,
    signIn: async (email, password) => {
      if (!supabase) return { ok: false, message: 'La conexión segura aún no está configurada. Puedes explorar la demostración.' };
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error || !data.user) return { ok: false, message: friendlyError(error?.message || 'invalid login') };
      await AsyncStorage.removeItem(DEMO_KEY); setDemoSession(false);
      const workspace = await activateUserWorkspace(data.user);
      const invitationToken = await pendingInvitation();
      if (invitationToken) return { ok: true, nextPath: `/invite?token=${encodeURIComponent(invitationToken)}` };
      return { ok: true, nextPath: !workspace.familyId ? '/consent' : workspace.profiles.length ? '/home' : '/onboarding' };
    },
    signUp: async (name, email, password) => {
      if (!supabase) return { ok: false, message: 'La creación de cuentas estará disponible al conectar el servidor seguro.' };
      const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { display_name: name.trim() } } });
      if (error) return { ok: false, message: friendlyError(error.message) };
      await AsyncStorage.removeItem(DEMO_KEY); setDemoSession(false);
      return { ok: true, needsEmailConfirmation: !data.session };
    },
    sendPasswordReset: async (email) => {
      if (!supabase) return { ok: false, message: 'La recuperación requiere conectar el servidor seguro.' };
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      return error ? { ok: false, message: friendlyError(error.message) } : { ok: true };
    },
    updatePassword: async (password) => {
      if (!supabase) return { ok: false, message: 'La recuperación requiere conectar el servidor seguro.' };
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { ok: false, message: friendlyError(error.message) } : { ok: true };
    },
    enterDemo: async () => { await supabase?.auth.signOut(); await AsyncStorage.setItem(DEMO_KEY, 'active'); useAppStore.getState().prepareWorkspace('demo'); setUser(null); setFamilyId(undefined); setFamilyName(undefined); setDemoSession(true); setSyncStatus('local'); },
    acceptEssentialConsent: async () => {
      if (!supabase || demoSession) return { ok: true };
      const displayName = user?.user_metadata?.display_name || 'Mi familia';
      const { data: createdFamilyId, error } = await supabase.rpc('create_family_for_current_user', { family_name: `Familia de ${displayName}` });
      if (error || !createdFamilyId || !user) return { ok: false, message: 'No pudimos preparar el espacio familiar. Inténtalo nuevamente.' };
      const { error: consentError } = await supabase.from('consents').upsert({ family_id: createdFamilyId, user_id: user.id, purpose: 'essential_privacy', policy_version: '2026-07-25', granted_at: new Date().toISOString(), revoked_at: null }, { onConflict: 'family_id,user_id,purpose,policy_version' });
      if (consentError) return { ok: false, message: 'No pudimos guardar tu consentimiento. Inténtalo nuevamente.' };
      if (useAppStore.getState().consentPreferences.documentAnalysis) {
        try { await grantDocumentAnalysisConsent(createdFamilyId, user.id, DOCUMENT_ANALYSIS_POLICY_VERSION); }
        catch { return { ok: false, message: 'Guardamos el espacio familiar, pero no el permiso opcional de documentos. Revisa tu elección e inténtalo nuevamente.' }; }
      }
      if (useAppStore.getState().consentPreferences.aiAssistant) {
        try { await grantAiAssistantConsent(createdFamilyId, user.id, FAMILY_INSIGHTS_POLICY_VERSION); }
        catch { return { ok: false, message: 'Guardamos el espacio familiar, pero no el permiso opcional del Asistente Emi. Revisa tu elección e inténtalo nuevamente.' }; }
      }
      setFamilyId(createdFamilyId); setFamilyName(`Familia de ${displayName}`); setSyncStatus('synced');
      return { ok: true };
    },
    syncNow: async () => {
      if (!supabase || demoSession) return { ok: true };
      if (!familyId) return { ok: false, message: 'Primero termina la configuración de tu familia.' };
      const synced = await runQueuedSync(true);
      return synced ? { ok: true } : useAppStore.getState().syncConflicts.length
        ? { ok: false, message: 'Encontramos cambios distintos en este dispositivo y en la nube. Revísalos antes de continuar.' }
        : { ok: false, message: 'No pudimos sincronizar. Tus cambios siguen protegidos en este dispositivo.' };
    },
    refreshWorkspace: async () => {
      if (!user) return { ok: false, message: 'Inicia sesión para actualizar tu espacio familiar.' };
      const workspace = await activateUserWorkspace(user);
      return workspace.familyId ? { ok: true } : { ok: false, message: 'No pudimos abrir el espacio familiar.' };
    },
    signOut: async () => { await supabase?.auth.signOut(); await AsyncStorage.removeItem(DEMO_KEY); setDemoSession(false); setUser(null); setFamilyId(undefined); setFamilyName(undefined); setSyncStatus(backendIsDemo ? 'local' : 'loading'); }
  }), [conflictCount, demoSession, familyId, familyName, loading, pendingSync?.changeCount, runQueuedSync, syncStatus, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return value;
}
