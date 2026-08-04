import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES, normalizedDocumentMime } from '../src/lib/cloudDocuments';

describe('documentos privados', () => {
  it('normaliza formatos admitidos por extensión cuando el dispositivo no informa MIME', () => {
    expect(normalizedDocumentMime('ultrasonido.PDF')).toBe('application/pdf');
    expect(normalizedDocumentMime('imagen.JPEG')).toBe('image/jpeg');
    expect(normalizedDocumentMime('captura.heic')).toBe('image/heic');
  });

  it('rechaza extensiones que no forman parte del expediente', () => {
    expect(normalizedDocumentMime('notas.exe')).toBeUndefined();
    expect(normalizedDocumentMime('informe.docx')).toBeUndefined();
  });

  it('mantiene explícitos el límite y la lista de tipos', () => {
    expect(MAX_DOCUMENT_BYTES).toBe(8 * 1024 * 1024);
    expect(ALLOWED_DOCUMENT_MIME_TYPES).toContain('application/pdf');
    expect(ALLOWED_DOCUMENT_MIME_TYPES).toContain('image/png');
  });
});
