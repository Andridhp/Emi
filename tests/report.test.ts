import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assessReportReadiness, buildConsultationReport, createConsultationReport } from '../src/lib/report';
import { initialEvents } from '../src/data/demo';
import { confirmedDocumentEvents } from '../src/lib/documents';
import { documents } from '../src/data/demo';
import { buildConsultationPdf, consultationPdfFileName } from '../src/lib/reportPdf';

describe('Resumen para consulta', () => {
  it('incluye identidad, eventos y descargo clínico', () => {
    const html = buildConsultationReport(initialEvents, 'routine');
    expect(html).toContain('Resumen para consulta');
    expect(html).toContain('Emilia');
    expect(html).toContain('Lactancia');
    expect(html).toContain('ni recomendación de tratamiento');
  });

  it('escapa texto de registros antes de generar HTML', () => {
    const html = buildConsultationReport([{ ...initialEvents[0], title: '<script>alert(1)</script>' }], 'illness');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('separa estrictamente los registros por perfil', () => {
    const mixed = [...initialEvents, { ...initialEvents[0], id: 'other', profileId: 'otro', title: 'Dato de otro bebé' }];
    const data = createConsultationReport(mixed, {
      type: 'routine', profileId: 'emilia', profileName: 'Emilia', period: '7d', sections: ['timeline'], referenceDate: new Date('2026-07-16T12:00:00')
    });
    expect(data.events.every((event) => event.profileId === 'emilia')).toBe(true);
    expect(data.events.some((event) => event.title === 'Dato de otro bebé')).toBe(false);
  });

  it('respeta el periodo y las secciones elegidas en el PDF', () => {
    const options = { type: 'illness' as const, profileId: 'emilia', profileName: 'Emilia', period: '24h' as const, sections: ['symptoms'] as const, referenceDate: new Date('2026-07-15T12:00:00') };
    const data = createConsultationReport(initialEvents, options);
    const html = buildConsultationReport(initialEvents, options);
    expect(data.events.every((event) => new Date(event.occurredAt) >= new Date('2026-07-14T12:00:00'))).toBe(true);
    expect(html).toContain('Temperatura y síntomas');
    expect(html).not.toContain('<h2>Línea de tiempo</h2>');
    expect(html).toContain('Últimas 24 horas');
  });

  it('incluye documentos confirmados con trazabilidad documental', () => {
    const merged = [...initialEvents, ...confirmedDocumentEvents(documents)];
    const html = buildConsultationReport(merged, { type: 'routine', profileId: 'pregnancy', profileName: 'Embarazo', period: 'since-consultation', sections: ['growth', 'timeline'], referenceDate: new Date('2026-07-18T12:00:00') });
    expect(html).toContain('Ultrasonido estructural.pdf');
    expect(html).toContain('Documento');
    expect(html).not.toContain('Cartilla de vacunación.pdf');
  });

  it('incluye motivo, preguntas propias y expediente prenatal cuando se autorizan', () => {
    const html = buildConsultationReport([], { type: 'routine', profileId: 'pregnancy', profileName: 'Embarazo', period: '7d', sections: ['prenatal', 'questions'], referenceDate: new Date('2026-07-24T12:00:00'), reason: 'Revisar próximos estudios', customQuestions: ['¿Cuándo repetir el ultrasonido?'], prenatalRecord: { profileId: 'pregnancy', dueDate: '2026-11-08', folicAcidStarted: '2026-01-12', supplements: 'Multivitamínico prenatal', updatedAt: '2026-07-24T12:00:00' } });
    expect(html).toContain('Revisar próximos estudios');
    expect(html).toContain('¿Cuándo repetir el ultrasonido?');
    expect(html).toContain('Fecha probable de parto');
    expect(html).toContain('2026-11-08');
  });

  it('muestra etiquetas de campos estructurados y escapa sus valores', () => {
    const event = { ...initialEvents[0], occurredAt: '2026-07-24T10:00:00', data: { milkType: 'Leche materna', amount: '<90>' } };
    const html = buildConsultationReport([event], { type: 'routine', profileId: 'emilia', profileName: 'Emilia', period: '24h', sections: ['care'], referenceDate: new Date('2026-07-24T12:00:00') });
    expect(html).toContain('<b>Contenido:</b> Leche materna');
    expect(html).toContain('&lt;90&gt;');
    expect(html).not.toContain('<90>');
  });

  it('prepara una lista conservadora de datos por revisar antes de compartir', () => {
    const report = createConsultationReport(initialEvents, { type: 'illness', profileId: 'emilia', profileName: 'Emilia', period: '24h', sections: ['timeline'], referenceDate: new Date('2026-07-15T12:00:00') });
    const readiness = assessReportReadiness(report);
    expect(readiness.readyToExport).toBe(true);
    expect(readiness.items.find((item) => item.id === 'reason')?.level).toBe('review');
    expect(readiness.items.find((item) => item.id === 'care')).toBeDefined();
  });

  it('no permite exportar un informe completamente vacío', () => {
    const report = createConsultationReport([], { type: 'routine', profileId: 'none', profileName: 'Sin datos', period: '24h', sections: [], referenceDate: new Date('2026-07-15T12:00:00') });
    expect(assessReportReadiness(report).readyToExport).toBe(false);
  });

  it('incluye nacimiento y posparto solo cuando la familia selecciona esa sección', () => {
    const html = buildConsultationReport([], { type:'routine',profileId:'emilia',profileName:'Emilia',period:'7d',sections:['birthPostpartum'],referenceDate:new Date('2026-07-24'),birthRecord:{profileId:'emilia',weight:'3.1 kg',confirmedBy:'Hospital',updatedAt:'2026-07-24'},postpartumRecord:{profileId:'emilia',recoveryNotes:'Seguimiento registrado',updatedAt:'2026-07-24'} });
    expect(html).toContain('Peso al nacer'); expect(html).toContain('3.1 kg'); expect(html).toContain('fuente declarada: Hospital'); expect(html).toContain('Seguimiento registrado');
  });

  it('genera bytes PDF reales con un nombre de archivo seguro', () => {
    const report = createConsultationReport(initialEvents, { type: 'routine', profileId: 'emilia', profileName: 'Emília / bebé', period: '7d', sections: ['care', 'sleep', 'timeline', 'questions'], referenceDate: new Date('2026-07-15T21:00:00'), reason: 'Revisar sueño y alimentación' });
    const bytes = buildConsultationPdf(report);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(2500);
    expect(consultationPdfFileName('Emília / bebé', new Date('2026-08-01T12:00:00Z'))).toBe('emi-resumen-emilia-bebe-2026-08-01.pdf');
    if (process.env.EMI_WRITE_PDF_ARTIFACT === '1') {
      const output = resolve('output/pdf'); mkdirSync(output, { recursive: true });
      writeFileSync(resolve(output, 'emi-resumen-demostracion.pdf'), bytes);
    }
  });
});
