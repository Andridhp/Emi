import { jsPDF } from 'jspdf';
import type { BirthRecord, EventKind, FamilyEvent, PostpartumRecord, PrenatalRecord, SourceKind } from '@/types/domain';
import { briefConsultationEvents, type ConsultationReportData, type ReportSection } from '@/lib/report';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 17;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const INK: [number, number, number] = [32, 57, 54];
const MUTED: [number, number, number] = [105, 122, 118];
const SAGE: [number, number, number] = [61, 103, 94];
const MINT: [number, number, number] = [229, 240, 235];
const PEACH: [number, number, number] = [255, 240, 230];
const LINE: [number, number, number] = [231, 226, 218];

const sourceLabels: Record<SourceKind, string> = {
  parent: 'Familia', document: 'Documento', calculated: 'Calculado por Emi', professional: 'Profesional', ai: 'Interpretación de IA'
};

const eventGroups: { section: ReportSection; title: string; kinds: EventKind[] }[] = [
  { section: 'care', title: 'Alimentación y pañales', kinds: ['feeding', 'diaper'] },
  { section: 'sleep', title: 'Sueño', kinds: ['sleep'] },
  { section: 'symptoms', title: 'Temperatura y síntomas', kinds: ['temperature', 'symptom'] },
  { section: 'comfort', title: 'Rutinas y confort', kinds: ['comfort'] },
  { section: 'treatments', title: 'Medicamentos y vacunas', kinds: ['medicine'] },
  { section: 'growth', title: 'Crecimiento', kinds: ['growth', 'prenatal'] }
];

const fieldLabels: Record<string, string> = {
  planningStarted: 'Inicio de planeación', lastMenstrualPeriod: 'Fecha de última menstruación', dueDate: 'Fecha probable de parto',
  dueDateConfirmedBy: 'Base de la fecha probable', folicAcidStarted: 'Inicio de ácido fólico', folicAcidDose: 'Dosis indicada',
  supplements: 'Suplementos', medicalHistory: 'Antecedentes personales', previousPregnancies: 'Embarazos anteriores',
  familyHistory: 'Antecedentes familiares', complications: 'Complicaciones o vigilancia', primaryProfessional: 'Profesional principal',
  bornAt: 'Fecha y hora de nacimiento', gestationalAge: 'Edad gestacional', birthType: 'Tipo de nacimiento', weight: 'Peso al nacer',
  length: 'Talla al nacer', headCircumference: 'Perímetro cefálico', apgar: 'Apgar documentado', neonatalCare: 'Atención neonatal',
  feedingStart: 'Inicio de alimentación', followUpDate: 'Revisión posparto', recoveryNotes: 'Recuperación física',
  feedingNotes: 'Lactancia o alimentación', restAndSupport: 'Descanso y apoyo', emotionalWellbeing: 'Bienestar emocional',
  medications: 'Medicamentos indicados', professionalInstructions: 'Indicaciones profesionales'
};

const eventDataLabels: Record<string, string> = {
  milkType: 'Contenido', amount: 'Cantidad', unit: 'Unidad', location: 'Lugar', quality: 'Cómo fue', color: 'Color',
  consistency: 'Consistencia', temperature: 'Temperatura', temperatureUnit: 'Unidad', method: 'Método', symptom: 'Síntoma',
  intensity: 'Intensidad', frequency: 'Frecuencia', medicine: 'Medicamento', dose: 'Dosis administrada', route: 'Vía',
  vaccine: 'Vacuna', reaction: 'Reacción observada', measurement: 'Medición', measurementUnit: 'Unidad', professional: 'Profesional',
  maternalWeight: 'Peso materno', bloodPressure: 'Presión arterial', uterineHeight: 'Altura uterina', fetalHeartRate: 'Frecuencia cardiaca fetal',
  study: 'Estudio', gestationalAge: 'Edad gestacional', estimatedFetalWeight: 'Peso fetal estimado', percentile: 'Percentil',
  placenta: 'Placenta', amnioticFluid: 'Líquido amniótico', cervicalLength: 'Longitud cervical', result: 'Resultado',
  glucose: 'Glucosa', instructions: 'Indicaciones', nextAppointment: 'Próxima cita', measuredBy: 'Medido por',
  duration: 'Duración aproximada', context: 'Contexto previo', response: 'Qué se intentó', outcome: 'Qué ocurrió después',
  timing: 'Momento', amountDescription: 'Cantidad observada', appearance: 'Aspecto observado', routineName: 'Rutina'
};

const cleanText = (value: unknown) => String(value ?? '').replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' ').trim();

export const consultationPdfFileName = (profileName: string, date = new Date()) => {
  const safeName = profileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'familia';
  return `emi-resumen-${safeName}-${date.toISOString().slice(0, 10)}.pdf`;
};

export function buildConsultationPdf(report: ConsultationReportData): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  doc.setProperties({
    title: `Resumen para consulta - ${cleanText(report.profileName)}`,
    subject: 'Resumen familiar para revisión profesional. No constituye un diagnóstico.',
    author: 'Emi', creator: 'Emi'
  });
  let y = 18;

  const continuationHeader = () => {
    doc.setFillColor(...MINT); doc.roundedRect(MARGIN, 12, 12, 12, 4, 4, 'F');
    doc.setTextColor(...SAGE); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('Emi', MARGIN + 6, 19.5, { align: 'center' });
    doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(cleanText(report.profileName), MARGIN + 17, 19.5);
    doc.setDrawColor(...LINE); doc.line(MARGIN, 29, PAGE_WIDTH - MARGIN, 29); y = 36;
  };
  const ensure = (height: number) => {
    if (y + height <= PAGE_HEIGHT - 20) return;
    doc.addPage(); continuationHeader();
  };
  const paragraph = (text: string, options: { color?: [number, number, number]; size?: number; width?: number; indent?: number; gap?: number } = {}) => {
    const size = options.size ?? 9;
    const indent = options.indent ?? 0;
    const lines = doc.splitTextToSize(cleanText(text), options.width ?? CONTENT_WIDTH - indent) as string[];
    const height = Math.max(5, lines.length * (size * 0.43));
    ensure(height + (options.gap ?? 3));
    doc.setTextColor(...(options.color ?? INK)); doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
    doc.text(lines, MARGIN + indent, y, { lineHeightFactor: 1.35 }); y += height + (options.gap ?? 3);
  };
  const section = (title: string) => {
    ensure(15); y += 3;
    doc.setTextColor(...SAGE); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(cleanText(title), MARGIN, y);
    y += 4; doc.setDrawColor(...LINE); doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y); y += 7;
  };
  const labelValue = (label: string, value: unknown, source = 'Familia') => {
    const text = cleanText(value); if (!text) return;
    const valueLines = doc.splitTextToSize(text, 105) as string[];
    const rowHeight = Math.max(12, valueLines.length * 4.2 + 6);
    ensure(rowHeight);
    doc.setFillColor(250, 249, 246); doc.roundedRect(MARGIN, y - 3.5, CONTENT_WIDTH, rowHeight - 1, 3, 3, 'F');
    doc.setTextColor(...MUTED); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text(cleanText(label), MARGIN + 4, y + 1);
    doc.setTextColor(...INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(valueLines, MARGIN + 51, y + 1, { lineHeightFactor: 1.3 });
    doc.setTextColor(...MUTED); doc.setFontSize(6.5); doc.text(cleanText(source), PAGE_WIDTH - MARGIN - 4, y + 1, { align: 'right' });
    y += rowHeight + 2;
  };
  const eventList = (events: FamilyEvent[]) => {
    if (!events.length) { paragraph('No hay registros en este periodo.', { color: MUTED }); return; }
    for (const event of events) {
      const structured = event.data ? Object.entries(event.data).map(([key, value]) => `${eventDataLabels[key] ?? key}: ${cleanText(value)}`).join(' | ') : '';
      const rawDetail = structured || cleanText(event.detail) || 'Sin detalle adicional';
      const detail = report.format === 'brief' && rawDetail.length > 180 ? `${rawDetail.slice(0, 177)}...` : rawDetail;
      const date = new Date(event.occurredAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
      const titleLines = doc.splitTextToSize(cleanText(event.title), 91) as string[];
      const detailLines = doc.splitTextToSize(detail, 101) as string[];
      const sourceLines = doc.splitTextToSize(sourceLabels[event.source], 28) as string[];
      const contentHeight = titleLines.length * 3.8 + detailLines.length * 3.6 + 5;
      const sourceHeight = sourceLines.length * 3.1 + 5;
      const height = Math.max(15, contentHeight, sourceHeight);
      ensure(height);
      doc.setFillColor(250, 249, 246); doc.roundedRect(MARGIN, y - 4, CONTENT_WIDTH, height - 1, 3, 3, 'F');
      doc.setTextColor(...SAGE); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(cleanText(date), MARGIN + 4, y + 1);
      doc.setTextColor(...INK); doc.setFontSize(8.5); doc.text(titleLines, MARGIN + 39, y + 1, { lineHeightFactor: 1.2 });
      const detailY = y + 1 + titleLines.length * 3.8 + 1.2;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED); doc.setFontSize(7.5); doc.text(detailLines, MARGIN + 39, detailY, { lineHeightFactor: 1.28 });
      doc.setTextColor(...SAGE); doc.setFontSize(6.5); doc.text(sourceLines, PAGE_WIDTH - MARGIN - 4, y + 1, { align: 'right', lineHeightFactor: 1.2 });
      y += height + 2;
    }
  };
  const record = (value: PrenatalRecord | BirthRecord | PostpartumRecord | undefined, allowed: string[]) => {
    if (!value) { paragraph('No hay información registrada.', { color: MUTED }); return; }
    const entries = allowed.flatMap((key) => {
      const item = (value as unknown as Record<string, unknown>)[key];
      return item ? [[key, item] as const] : [];
    });
    if (!entries.length) { paragraph('El expediente existe, pero no contiene campos seleccionables.', { color: MUTED }); return; }
    for (const [key, item] of entries) labelValue(fieldLabels[key] ?? key, item, 'Familia');
  };

  doc.setFillColor(...MINT); doc.roundedRect(MARGIN, y - 5, 18, 18, 6, 6, 'F');
  doc.setTextColor(...SAGE); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Emi', MARGIN + 9, y + 6.5, { align: 'center' });
  doc.setTextColor(...INK); doc.setFontSize(21); doc.text(report.format === 'brief' ? 'Resumen breve' : 'Resumen para consulta', MARGIN + 24, y + 1);
  doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(`${cleanText(report.profileName)} | ${report.type === 'routine' ? 'Control rutinario' : 'Consulta por enfermedad'}`, MARGIN + 24, y + 7);
  doc.text(`${cleanText(report.periodTitle)} | ${cleanText(report.dateRange)}`, MARGIN + 24, y + 12);
  y += 23;

  doc.setFillColor(...MINT); doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 19, 4, 4, 'F');
  doc.setTextColor(...SAGE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('IMPORTANTE', MARGIN + 5, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK); doc.setFontSize(8);
  const notice = doc.splitTextToSize('Este resumen organiza registros familiares y cálculos de Emi. No es un expediente médico, diagnóstico ni recomendación de tratamiento.', CONTENT_WIDTH - 10) as string[];
  doc.text(notice, MARGIN + 5, y + 11, { lineHeightFactor: 1.25 }); y += 25;

  if (report.reason) {
    const reasonText = report.format === 'brief' && report.reason.length > 240 ? `${report.reason.slice(0, 237)}...` : report.reason;
    const reasonLines = doc.splitTextToSize(cleanText(reasonText), CONTENT_WIDTH - 10) as string[];
    const reasonHeight = Math.max(17, 12 + reasonLines.length * 4.2);
    ensure(reasonHeight + 5);
    doc.setFillColor(...PEACH); doc.roundedRect(MARGIN, y, CONTENT_WIDTH, reasonHeight, 4, 4, 'F');
    doc.setTextColor(143, 92, 75); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text('MOTIVO O PRIORIDAD PARA ESTA CONSULTA', MARGIN + 5, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK); doc.setFontSize(8.5); doc.text(reasonLines, MARGIN + 5, y + 11, { lineHeightFactor: 1.28 }); y += reasonHeight + 5;
  }

  section('Vista rápida');
  const sleep = report.sleepMinutes >= 60 ? `${Math.floor(report.sleepMinutes / 60)} h ${report.sleepMinutes % 60} min` : `${report.sleepMinutes} min`;
  const stats = [
    [`${report.counts.feeding}`, 'Tomas'], [sleep, 'Sueño registrado'], [`${report.counts.diaper}`, 'Pañales'],
    [`${report.counts.temperature + report.counts.symptom}`, 'Temperaturas y síntomas']
  ];
  const statWidth = (CONTENT_WIDTH - 9) / 4;
  stats.forEach(([value, label], index) => {
    const x = MARGIN + index * (statWidth + 3);
    doc.setFillColor(250, 249, 246); doc.roundedRect(x, y - 3, statWidth, 18, 3, 3, 'F');
    doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(cleanText(value), x + 4, y + 4);
    doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.text(doc.splitTextToSize(cleanText(label), statWidth - 8), x + 4, y + 10, { lineHeightFactor: 1.15 });
  });
  y += 23;

  const addDocuments = (items = report.documents) => {
    section('Documentos del periodo');
    paragraph('Emi sólo incorpora como datos los campos confirmados por la familia. Los demás archivos aparecen como guardados sin análisis confirmado.', { color: MUTED, size: 7.5 });
    if (!items.length) paragraph('No hay documentos guardados en este periodo.', { color: MUTED });
    for (const item of items) {
      labelValue(
        `${item.occurredAt ? new Date(item.occurredAt).toLocaleDateString('es-MX') : item.date} · ${item.category}`,
        item.status === 'reviewed' && item.extracted.length ? `${item.name} — ${item.extracted.join(' · ').slice(0, report.format === 'brief' ? 180 : undefined)}` : `${item.name} — Sin datos confirmados`,
        item.status === 'reviewed' ? 'Confirmado por la familia' : 'Guardado sin análisis'
      );
    }
  };
  if (report.format === 'brief') {
    section('Registros representativos para comentar'); paragraph('Selección por categorías; no es una clasificación de gravedad.', { color: MUTED, size: 7 }); eventList(briefConsultationEvents(report.events, 3));
    if (report.sections.has('documents')) addDocuments(report.documents.slice(0, 1));
    if (report.sections.has('questions')) {
      section('Preguntas prioritarias');
      report.questions.slice(0, 2).forEach((question, index) => paragraph(`${index + 1}. ${question}`, { indent: 2, gap: 2 }));
    }
  } else {
  for (const group of eventGroups) if (report.sections.has(group.section)) {
    section(group.title); eventList(report.events.filter((event) => group.kinds.includes(event.kind)));
  }
  if (report.sections.has('documents')) {
    addDocuments();
  }
  if (report.sections.has('prenatal')) {
    section('Expediente prenatal actual'); paragraph('Esta sección puede incluir información anterior al periodo seleccionado.', { color: MUTED, size: 7.5 });
    record(report.prenatalRecord, ['planningStarted','lastMenstrualPeriod','dueDate','dueDateConfirmedBy','folicAcidStarted','folicAcidDose','supplements','medicalHistory','previousPregnancies','familyHistory','complications','primaryProfessional']);
  }
  if (report.sections.has('birthPostpartum')) {
    section('Nacimiento'); paragraph('Información histórica registrada; no es una interpretación clínica.', { color: MUTED, size: 7.5 });
    record(report.birthRecord, ['bornAt','gestationalAge','birthType','weight','length','headCircumference','apgar','complications','neonatalCare','feedingStart']);
    section('Posparto materno');
    record(report.postpartumRecord, ['followUpDate','recoveryNotes','feedingNotes','restAndSupport','emotionalWellbeing','medications','professionalInstructions']);
  }
  if (report.sections.has('timeline')) { section('Línea de tiempo'); eventList(report.events); }
  if (report.sections.has('questions')) {
    section('Preguntas para el profesional');
    report.questions.forEach((question, index) => paragraph(`${index + 1}. ${question}`, { indent: 2, gap: 2 }));
  }
  }

  ensure(24); y += 5; doc.setDrawColor(...LINE); doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y); y += 7;
  paragraph(`Generado por Emi con ${report.events.length} registros y ${report.documents.length} documentos del perfil seleccionado. Cada bebé y embarazo es distinto. Revisa el contenido antes de compartirlo.`, { color: MUTED, size: 7.5 });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page); doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.text('Información sensible - compartir sólo con la persona elegida', MARGIN, PAGE_HEIGHT - 9);
    doc.text(`${page} / ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 9, { align: 'right' });
  }
  return new Uint8Array(doc.output('arraybuffer'));
}

export function downloadConsultationPdf(bytes: Uint8Array, fileName: string) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.rel = 'noopener';
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
