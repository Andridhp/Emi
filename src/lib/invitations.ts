import { supabase } from '@/lib/supabase';
import type { ProfileAccess } from '@/lib/access';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_INVITATION_KEY = 'emi-pending-invitation-v1';

export type InvitationResult = { token: string; expiresAt: string };

export async function createCaregiverInvitation(input: {
  familyId: string;
  email: string;
  name: string;
  relationship: string;
  profileAccess: Record<string, ProfileAccess>;
}): Promise<InvitationResult> {
  if (!supabase) throw new Error('backend unavailable');
  const { data, error } = await supabase.rpc('create_caregiver_invitation', {
    target_family: input.familyId,
    invited_email: input.email.trim().toLowerCase(),
    invited_name: input.name.trim(),
    invited_relationship: input.relationship.trim(),
    requested_profile_access: input.profileAccess,
    validity_hours: 72
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.invitation_token) throw new Error('invitation unavailable');
  return { token: row.invitation_token, expiresAt: row.invitation_expires_at };
}

export async function acceptCaregiverInvitation(token: string): Promise<string> {
  if (!supabase) throw new Error('backend unavailable');
  const { data, error } = await supabase.rpc('accept_caregiver_invitation', { invitation_token: token.trim() });
  if (error || !data) throw error || new Error('invitation unavailable');
  return data as string;
}

export async function setCloudCaregiverAccess(familyId: string, caregiverId: string, profileId: string, access?: ProfileAccess) {
  if (!supabase) throw new Error('backend unavailable');
  const { error } = await supabase.rpc('set_caregiver_profile_access', { target_family: familyId, caregiver_user: caregiverId, profile_client_id: profileId, requested_access: access || '' });
  if (error) throw error;
}

export async function removeCloudCaregiver(familyId: string, caregiverId: string) {
  if (!supabase) throw new Error('backend unavailable');
  const { error } = await supabase.rpc('remove_family_caregiver', { target_family: familyId, caregiver_user: caregiverId });
  if (error) throw error;
}

export function invitationUrl(token: string, origin?: string) {
  const base = origin?.replace(/\/$/, '') || 'https://app.emi.family';
  return `${base}/invite?token=${encodeURIComponent(token)}`;
}

export const rememberInvitation = (token: string) => AsyncStorage.setItem(PENDING_INVITATION_KEY, token.trim());
export const pendingInvitation = () => AsyncStorage.getItem(PENDING_INVITATION_KEY);
export const forgetInvitation = () => AsyncStorage.removeItem(PENDING_INVITATION_KEY);
