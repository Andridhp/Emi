import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined), removeItem: vi.fn(async () => undefined) }
}));
vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { invitationUrl } from '../src/lib/invitations';

describe('invitaciones familiares', () => {
  it('crea un vínculo web con el token codificado', () => {
    expect(invitationUrl('token con espacios', 'https://emi.example/')).toBe('https://emi.example/invite?token=token%20con%20espacios');
  });

  it('no expone parámetros adicionales en el vínculo', () => {
    const url = invitationUrl('secreto', 'https://emi.example');
    expect(new URL(url).searchParams.get('token')).toBe('secreto');
    expect([...new URL(url).searchParams.keys()]).toEqual(['token']);
  });
});
