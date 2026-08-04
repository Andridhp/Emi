import { describe, expect, it } from 'vitest';
import { appendVoiceTranscript, cleanVoiceTranscript } from '../src/lib/voice';

describe('Borrador por voz', () => {
  it('normaliza espacios sin interpretar el contenido', () => {
    expect(cleanVoiceTranscript('  Comió   poco hoy  ')).toBe('Comió poco hoy');
  });

  it('conserva la nota existente y agrega el dictado como texto', () => {
    expect(appendVoiceTranscript('Después de la toma', 'se quedó tranquila')).toBe('Después de la toma · se quedó tranquila');
  });

  it('limita borradores excesivos antes de mostrarlos para revisión', () => {
    expect(cleanVoiceTranscript('a'.repeat(2000))).toHaveLength(1500);
  });
});
