import { DocumentRecord, FamilyEvent, FamilyProfile, Insight, Pregnancy } from '@/types/domain';

export const profiles: FamilyProfile[] = [
  { id: 'emilia', name: 'Emilia', stage: 'child', birthDate: '2026-04-27', avatar: 'E', gestationalWeeksAtBirth: 38, createdAt: '2026-07-15T00:00:00.000Z' },
  { id: 'pregnancy', name: 'Embarazo', stage: 'pregnancy', dueDate: '2026-11-08', avatar: '♡', createdAt: '2026-07-15T00:00:00.000Z' }
];

export const pregnancy: Pregnancy = {
  dueDate: '8 nov 2026', gestationalAge: '23 semanas + 3 días', trimester: 2,
  folicAcidSince: '12 ene 2026', nextAppointment: '22 jul · Ginecología', consultations: 5, studies: 3
};

export const initialEvents: FamilyEvent[] = [
  { id: 'e1', profileId: 'emilia', kind: 'feeding', title: 'Lactancia', detail: 'Pecho izquierdo · 18 min', occurredAt: '2026-07-15T08:42:00', source: 'parent' },
  { id: 'e2', profileId: 'emilia', kind: 'diaper', title: 'Pañal', detail: 'Mojado', occurredAt: '2026-07-15T08:16:00', source: 'parent' },
  { id: 'e3', profileId: 'emilia', kind: 'sleep', title: 'Sueño', detail: '1 h 12 min · cuna', occurredAt: '2026-07-15T06:55:00', source: 'calculated', value: 72, unit: 'min' },
  { id: 'e4', profileId: 'emilia', kind: 'temperature', title: 'Temperatura', detail: '36.7 °C', occurredAt: '2026-07-15T06:31:00', source: 'parent', value: 36.7, unit: '°C' },
  { id: 'e5', profileId: 'emilia', kind: 'feeding', title: 'Lactancia', detail: 'Pecho derecho · 14 min', occurredAt: '2026-07-15T04:48:00', source: 'parent' },
  { id: 'e6', profileId: 'emilia', kind: 'sleep', title: 'Siesta', detail: '45 min · brazos', occurredAt: '2026-07-14T08:00:00', source: 'parent', value: 45, unit: 'min' },
  { id: 'e7', profileId: 'emilia', kind: 'sleep', title: 'Siesta', detail: '55 min · cuna', occurredAt: '2026-07-14T10:05:00', source: 'parent', value: 55, unit: 'min' },
  { id: 'e8', profileId: 'emilia', kind: 'sleep', title: 'Siesta', detail: '50 min · portabebé', occurredAt: '2026-07-14T12:25:00', source: 'parent', value: 50, unit: 'min' },
  { id: 'e9', profileId: 'emilia', kind: 'sleep', title: 'Siesta', detail: '40 min · cuna', occurredAt: '2026-07-14T14:45:00', source: 'parent', value: 40, unit: 'min' },
  { id: 'e10', profileId: 'emilia', kind: 'sleep', title: 'Siesta', detail: '35 min · brazos', occurredAt: '2026-07-14T17:00:00', source: 'parent', value: 35, unit: 'min' },
  { id: 'e11', profileId: 'emilia', kind: 'sleep', title: 'Sueño nocturno', detail: '10 h 40 min · con despertares', occurredAt: '2026-07-14T19:40:00', source: 'parent', value: 640, unit: 'min' },
  { id: 'e12', profileId: 'emilia', kind: 'sleep', title: 'Siesta', detail: '45 min · brazos', occurredAt: '2026-07-15T20:30:00', source: 'parent', value: 45, unit: 'min' }
];

export const insights: Insight[] = [
  { id: 'i1', title: 'Ventana de sueño acercándose', body: 'Según sus últimos 7 días, Emilia suele mostrar sueño entre 10:15 y 10:35. Es una estimación; observa sus señales.', level: 'expected', source: 'ai' },
  { id: 'i2', title: 'Hidratación en su patrón habitual', body: 'Registra 4 pañales mojados hoy, similar a su promedio a esta hora.', level: 'expected', source: 'calculated' }
];

export const documents: DocumentRecord[] = [
  { id: 'd1', profileId: 'pregnancy', name: 'Ultrasonido estructural.pdf', category: 'Medicina materno-fetal', date: '8 jul 2026', occurredAt: '2026-07-08T12:00:00', status: 'reviewed', analysisStatus: 'confirmed', extracted: ['Edad gestacional: 22+3', 'Peso fetal estimado: 510 g', 'Placenta: posterior'] },
  { id: 'd2', profileId: 'pregnancy', name: 'Laboratorio segundo trimestre.jpg', category: 'Laboratorio', date: '2 jul 2026', occurredAt: '2026-07-02T12:00:00', status: 'pending', extracted: [] },
  { id: 'd3', profileId: 'emilia', name: 'Cartilla de vacunación.pdf', category: 'Pediatría', date: '25 jun 2026', occurredAt: '2026-06-25T12:00:00', status: 'reviewed', analysisStatus: 'confirmed', extracted: ['BCG: registrada', 'Hepatitis B: registrada'] }
];
