import { ConsultationQuestion } from '@/types/domain';

export function questionsForProfile(questions: ConsultationQuestion[], profileId: string) {
  return questions.filter((question) => question.profileId === profileId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function pendingQuestionTexts(questions: ConsultationQuestion[], profileId: string) {
  return questionsForProfile(questions, profileId).filter((question) => !question.resolvedAt).map((question) => question.text);
}
