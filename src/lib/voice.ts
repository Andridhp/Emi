export function cleanVoiceTranscript(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 1500);
}

export function appendVoiceTranscript(existing: string, transcript: string) {
  const clean = cleanVoiceTranscript(transcript);
  if (!clean) return existing.trim();
  return [existing.trim(), clean].filter(Boolean).join(existing.trim() ? ' · ' : '');
}
