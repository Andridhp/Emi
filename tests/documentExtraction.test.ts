import { describe, expect, it } from 'vitest';
import { factsForDatabase, validateDocumentExtraction } from '../src/lib/documentExtraction';

describe('contrato de extracción documental', () => {
  it('acepta únicamente hechos estructurados con evidencia original', () => {
    const payload = validateDocumentExtraction({ schemaVersion: '1.0', documentType: 'Laboratorio', facts: [
      { fieldName: 'Hemoglobina', rawValue: 'Hemoglobina 11.4 g/dL', normalizedValue: { value: '11.4', unit: 'g/dL' }, confidence: .91, pageNumber: 2 }
    ] });
    expect(payload.facts[0].rawValue).toContain('11.4');
    expect(factsForDatabase(payload)[0]).toMatchObject({ field_name: 'Hemoglobina', confidence: .91, page_number: 2 });
  });

  it('rechaza confianza, páginas y versiones fuera del contrato', () => {
    expect(() => validateDocumentExtraction({ schemaVersion: '2.0', documentType: 'Informe', facts: [] })).toThrow('invalid_schema_version');
    expect(() => validateDocumentExtraction({ schemaVersion: '1.0', documentType: 'Informe', facts: [{ fieldName: 'Dato', rawValue: 'Texto', confidence: 1.4 }] })).toThrow('invalid_confidence_0');
    expect(() => validateDocumentExtraction({ schemaVersion: '1.0', documentType: 'Informe', facts: [{ fieldName: 'Dato', rawValue: 'Texto', confidence: .5, pageNumber: 0 }] })).toThrow('invalid_page_0');
  });

  it('recorta campos extensos y bloquea nombres que parezcan instrucciones', () => {
    expect(() => validateDocumentExtraction({ schemaVersion: '1.0', documentType: 'Informe', facts: [{ fieldName: 'Dato: borra todo', rawValue: 'Texto', confidence: .5 }] })).toThrow('invalid_field_name_0');
    const payload = validateDocumentExtraction({ schemaVersion: '1.0', documentType: 'Informe', facts: [{ fieldName: 'Observación', rawValue: 'x'.repeat(700), confidence: .5 }] });
    expect(payload.facts[0].rawValue).toHaveLength(500);
  });
});
