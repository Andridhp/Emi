import { FamilyProfile } from '@/types/domain';

const daysBetween = (from: Date, to: Date) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));

export function profileAgeLabel(profile?: FamilyProfile, now = new Date()) {
  if (!profile) return 'Perfil familiar';
  if (profile.stage === 'pregnancy' && profile.dueDate) {
    const due = new Date(`${profile.dueDate}T12:00:00`);
    const gestationDays = Math.max(0, 280 - daysBetween(now, due));
    return `${Math.floor(gestationDays / 7)} semanas + ${gestationDays % 7} días`;
  }
  if (profile.birthDate) {
    const born = new Date(`${profile.birthDate}T12:00:00`);
    const days = daysBetween(born, now);
    if (days < 60) return `${days} días`;
    const months = Math.max(0, (now.getFullYear() - born.getFullYear()) * 12 + now.getMonth() - born.getMonth());
    return months < 24 ? `${months} meses` : `${Math.floor(months / 12)} años · ${months % 12} meses`;
  }
  return profile.stage === 'pregnancy' ? 'Embarazo' : 'Infancia';
}

export function makeProfileId(name: string) {
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'perfil';
  return `${slug}-${Date.now().toString(36)}`;
}
