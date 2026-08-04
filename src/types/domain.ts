export type SourceKind = 'parent' | 'document' | 'calculated' | 'professional' | 'ai';
export type GuidanceLevel = 'expected' | 'observe' | 'consult' | 'urgent';
export type EventKind = 'sleep' | 'feeding' | 'diaper' | 'symptom' | 'medicine' | 'temperature' | 'growth' | 'prenatal' | 'comfort';

export type ProfileStage = 'child' | 'pregnancy';

export interface FamilyProfile {
  id: string; name: string; stage: ProfileStage; avatar: string; createdAt: string;
  birthDate?: string; dueDate?: string; gestationalWeeksAtBirth?: number;
}

export interface Caregiver {
  id: string; name: string; relationship: string; access: 'admin' | 'caregiver';
  profileAccess?: Record<string, 'viewer' | 'editor' | 'manager'>;
}

export interface ConsultationQuestion {
  id: string; profileId: string; text: string; createdAt: string; resolvedAt?: string;
}

export interface FamilyEvent {
  id: string; profileId: string; kind: EventKind; title: string; detail: string;
  occurredAt: string; source: SourceKind; value?: number; unit?: string;
  data?: Record<string, string | number | boolean>;
}

export interface Insight {
  id: string; title: string; body: string; level: GuidanceLevel; source: SourceKind;
}

export interface DocumentRecord {
  id: string; name: string; category: string; date: string; status: 'reviewed' | 'pending';
  extracted: string[]; profileId?: string; uri?: string; mimeType?: string;
  analysisStatus?: 'idle' | 'processing' | 'ready' | 'confirmed' | 'failed'; extractedFields?: DocumentField[]; occurredAt?: string;
  analysisMethod?: 'local-demo' | 'protected-ocr-ai'; analysisRequestedAt?: string; analysisConsentedAt?: string;
  sizeBytes?: number; localOnly?: boolean;
  cloudId?: string; storagePath?: string;
  uploadStatus?: 'local' | 'uploading' | 'uploaded' | 'failed';
  processingJobId?: string;
}

export interface DocumentField {
  id: string; label: string; value: string; selected: boolean;
  confidence: 'high' | 'medium' | 'low'; sourcePage?: number; rawValue?: string;
}

export interface Pregnancy {
  dueDate: string; gestationalAge: string; trimester: number; folicAcidSince: string;
  nextAppointment: string; consultations: number; studies: number;
}

export interface PrenatalRecord {
  profileId: string;
  planningStarted?: string;
  lastMenstrualPeriod?: string;
  dueDate?: string;
  dueDateConfirmedBy?: string;
  folicAcidStarted?: string;
  folicAcidDose?: string;
  supplements?: string;
  medicalHistory?: string;
  previousPregnancies?: string;
  familyHistory?: string;
  complications?: string;
  primaryProfessional?: string;
  updatedAt: string;
}

export interface BirthRecord {
  profileId: string;
  bornAt?: string;
  gestationalAge?: string;
  birthType?: string;
  weight?: string;
  length?: string;
  headCircumference?: string;
  apgar?: string;
  complications?: string;
  neonatalCare?: string;
  feedingStart?: string;
  confirmedBy?: string;
  updatedAt: string;
}

export interface PostpartumRecord {
  profileId: string;
  followUpDate?: string;
  recoveryNotes?: string;
  feedingNotes?: string;
  restAndSupport?: string;
  emotionalWellbeing?: string;
  medications?: string;
  professionalInstructions?: string;
  confirmedBy?: string;
  updatedAt: string;
}

export type ConsentPurpose = 'localStorage' | 'documentAnalysis' | 'aiAssistant' | 'voice' | 'productAnalytics';
export type ConsentPreferences = Record<ConsentPurpose, boolean>;
