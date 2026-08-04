export type ProfileAccess = 'viewer' | 'editor' | 'manager';

export const accessLabel: Record<ProfileAccess, string> = {
  viewer: 'Solo puede ver', editor: 'Puede registrar', manager: 'Puede administrar'
};

export function accessCapabilities(level?: ProfileAccess) {
  return {
    read: Boolean(level),
    create: level === 'editor' || level === 'manager',
    manage: level === 'manager'
  };
}
