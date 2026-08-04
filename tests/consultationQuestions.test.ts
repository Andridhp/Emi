import { describe, expect, it } from 'vitest';
import { pendingQuestionTexts, questionsForProfile } from '../src/lib/consultationQuestions';
import { ConsultationQuestion } from '../src/types/domain';

const questions: ConsultationQuestion[] = [
  { id: 'a', profileId: 'emilia', text: '¿Primera?', createdAt: '2026-07-20T10:00:00Z' },
  { id: 'b', profileId: 'emilia', text: '¿Ya conversada?', createdAt: '2026-07-21T10:00:00Z', resolvedAt: '2026-07-22T10:00:00Z' },
  { id: 'c', profileId: 'pregnancy', text: '¿Otro perfil?', createdAt: '2026-07-23T10:00:00Z' },
  { id: 'd', profileId: 'emilia', text: '¿Más reciente?', createdAt: '2026-07-24T10:00:00Z' }
];

describe('Preguntas para consulta', () => {
  it('separa perfiles y ordena de la más reciente a la anterior', () => {
    expect(questionsForProfile(questions, 'emilia').map((item) => item.id)).toEqual(['d', 'b', 'a']);
  });
  it('envía al reporte solo el texto de preguntas pendientes', () => {
    expect(pendingQuestionTexts(questions, 'emilia')).toEqual(['¿Más reciente?', '¿Primera?']);
  });
});
