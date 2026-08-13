import { MaterialCommunityIcons } from '@/components/MaterialCommunityIcons';

export type NavItem = { label: string; href: string; icon: keyof typeof MaterialCommunityIcons.glyphMap };

export const primaryNavigation: NavItem[] = [
  { label: 'Inicio', href: '/home', icon: 'home-heart' },
  { label: 'Niños y familia', href: '/profiles', icon: 'account-multiple-outline' },
  { label: 'Registrar', href: '/today', icon: 'plus-circle-outline' },
  { label: 'Agenda', href: '/calendar', icon: 'calendar-blank-outline' },
  { label: 'Expediente', href: '/documents', icon: 'folder-heart-outline' },
  { label: 'Resumen para consulta', href: '/report', icon: 'file-document-outline' },
  { label: 'Más', href: '/explore', icon: 'dots-grid' }
];

export const mobileNavigation: NavItem[] = [primaryNavigation[0], primaryNavigation[2], primaryNavigation[3], primaryNavigation[6]];

export const navGroups: { label: string; items: NavItem[] }[] = [
  { label: 'Tu espacio', items: primaryNavigation.slice(0, 3) },
  { label: 'Historia y consulta', items: [...primaryNavigation.slice(3, 6), { label: 'Preguntas para consulta', href: '/consultation-prep', icon: 'comment-question-outline' }, { label: 'Relevo de cuidados', href: '/handoff', icon: 'account-switch-outline' }, { label: 'Análisis explicable', href: '/analysis', icon: 'chart-box-outline' }, { label: 'Asistente Emi', href: '/assistant', icon: 'creation-outline' }] },
  { label: 'Registros del bebé', items: [
    { label: 'Lactancia y alimentación', href: '/feeding', icon: 'mother-nurse' },
    { label: 'Sueño', href: '/sleep', icon: 'weather-night' },
    { label: 'Pañales y evacuaciones', href: '/diapers', icon: 'water-outline' },
    { label: 'Síntomas y bienestar', href: '/wellbeing', icon: 'medical-bag' },
    { label: 'Rutinas y confort', href: '/comfort', icon: 'heart-outline' },
    { label: 'Medicamentos y vacunas', href: '/health-history', icon: 'pill' },
    { label: 'Crecimiento', href: '/growth', icon: 'chart-line' },
    { label: 'Desarrollo infantil', href: '/development', icon: 'star-outline' }
  ] },
  { label: 'Embarazo y nacimiento', items: [{ label: 'Expediente prenatal', href: '/prenatal', icon: 'human-pregnant' }, { label: 'Registro prenatal', href: '/track/prenatal', icon: 'heart-pulse' }, { label: 'Nacimiento y posparto', href: '/birth-postpartum', icon: 'baby-face-outline' }] },
  { label: 'Seguridad', items: [{ label: 'Orientación segura', href: '/guidance', icon: 'shield-alert-outline' }] },
  { label: 'Configuración', items: [{ label: 'Privacidad y datos', href: '/privacy', icon: 'shield-lock-outline' }, { label: 'Avisos', href: '/notifications', icon: 'bell-outline' }] }
];
