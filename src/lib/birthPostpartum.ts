import { BirthRecord, PostpartumRecord } from '@/types/domain';

export function birthRecordCompleteness(record?: BirthRecord) {
  const fields = [record?.bornAt, record?.gestationalAge, record?.birthType, record?.weight, record?.confirmedBy];
  return { completed: fields.filter(Boolean).length, total: fields.length, hasProfessionalSource: Boolean(record?.confirmedBy) };
}

export function postpartumRecordCompleteness(record?: PostpartumRecord) {
  const fields = [record?.followUpDate, record?.recoveryNotes, record?.restAndSupport, record?.professionalInstructions];
  return { completed: fields.filter(Boolean).length, total: fields.length };
}

export function continuitySummary(birth?: BirthRecord, postpartum?: PostpartumRecord) {
  return {
    birthAvailable: Boolean(birth && Object.keys(birth).length > 3),
    postpartumAvailable: Boolean(postpartum && Object.keys(postpartum).length > 3),
    sources: [birth?.confirmedBy, postpartum?.confirmedBy].filter(Boolean)
  };
}
