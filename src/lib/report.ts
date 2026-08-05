import { BirthRecord, DocumentRecord, EventKind, FamilyEvent, PostpartumRecord, PrenatalRecord, SourceKind } from '@/types/domain';

export type ReportType = 'routine' | 'illness';
export type ReportFormat = 'brief' | 'complete';
export type ReportSection = 'timeline' | 'care' | 'sleep' | 'symptoms' | 'comfort' | 'treatments' | 'growth' | 'documents' | 'prenatal' | 'birthPostpartum' | 'questions';
export type ReportPeriod = '24h' | '7d' | '30d' | 'since-consultation';

export const reportSections: { id: ReportSection; label: string }[] = [
  { id: 'timeline', label: 'Línea de tiempo' },
  { id: 'care', label: 'Alimentación y pañales' },
  { id: 'sleep', label: 'Sueño' },
  { id: 'symptoms', label: 'Temperatura y síntomas' },
  { id: 'comfort', label: 'Rutinas y confort' },
  { id: 'treatments', label: 'Medicamentos y vacunas' },
  { id: 'growth', label: 'Crecimiento' },
  { id: 'documents', label: 'Documentos del periodo' },
  { id: 'prenatal', label: 'Expediente prenatal' },
  { id: 'birthPostpartum', label: 'Nacimiento y posparto' },
  { id: 'questions', label: 'Preguntas sugeridas' }
];

export const reportPeriods: { id: ReportPeriod; title: string; days: number }[] = [
  { id: '24h', title: 'Últimas 24 horas', days: 1 },
  { id: '7d', title: 'Últimos 7 días', days: 7 },
  { id: '30d', title: 'Últimos 30 días', days: 30 },
  { id: 'since-consultation', title: 'Desde la última consulta', days: 0 }
];

export interface ConsultationReportOptions {
  type: ReportType;
  profileId: string;
  profileName: string;
  period: ReportPeriod;
  sections: Iterable<ReportSection>;
  referenceDate?: Date;
  reason?: string;
  customQuestions?: string[];
  prenatalRecord?: PrenatalRecord;
  birthRecord?: BirthRecord;
  postpartumRecord?: PostpartumRecord;
  documents?: DocumentRecord[];
  lastConsultationDate?: string;
  format?: ReportFormat;
  shareProfileName?: boolean;
}

export interface ConsultationReportData {
  type: ReportType;
  profileName: string;
  periodTitle: string;
  dateRange: string;
  periodStart: string;
  periodEnd: string;
  events: FamilyEvent[];
  sections: Set<ReportSection>;
  counts: Record<EventKind, number>;
  sleepMinutes: number;
  sourceCounts: Partial<Record<SourceKind, number>>;
  questions: string[];
  reason?: string;
  prenatalRecord?: PrenatalRecord;
  birthRecord?: BirthRecord;
  postpartumRecord?: PostpartumRecord;
  documents: DocumentRecord[];
  format: ReportFormat;
}

export interface ReportReadinessItem {
  id: string;
  level: 'ready' | 'review';
  label: string;
  detail: string;
}

export interface ReportReadiness {
  readyToExport: boolean;
  completed: number;
  total: number;
  items: ReportReadinessItem[];
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]!));
const kinds: EventKind[] = ['sleep', 'feeding', 'diaper', 'symptom', 'medicine', 'temperature', 'growth', 'prenatal', 'comfort'];
const kindLabel: Record<EventKind, string> = { sleep: 'Sueño', feeding: 'Alimentación', diaper: 'Pañales', symptom: 'Síntomas', medicine: 'Medicamentos y vacunas', temperature: 'Temperatura', growth: 'Crecimiento', prenatal: 'Seguimiento prenatal', comfort: 'Rutinas y confort' };
const sourceLabel: Record<SourceKind, string> = { parent: 'Familia', document: 'Documento', calculated: 'Calculado por la app', professional: 'Profesional', ai: 'Interpretación de IA' };

export function createConsultationReport(events: FamilyEvent[], options: ConsultationReportOptions): ConsultationReportData {
  const requestedPeriod = reportPeriods.find((item) => item.id === options.period) ?? reportPeriods[1];
  const reference = options.referenceDate ?? new Date();
  const consultationStart = options.lastConsultationDate ? new Date(`${options.lastConsultationDate}T00:00:00`) : undefined;
  const hasValidConsultationStart = consultationStart && !Number.isNaN(consultationStart.getTime()) && consultationStart <= reference;
  const usesConsultationDate = requestedPeriod.id === 'since-consultation' && hasValidConsultationStart;
  const period = requestedPeriod.id === 'since-consultation' && !hasValidConsultationStart ? reportPeriods[1] : requestedPeriod;
  const start = usesConsultationDate ? consultationStart : new Date(reference.getTime() - period.days * 24 * 60 * 60 * 1000);
  const filtered = events
    .filter((event) => event.profileId === options.profileId)
    .filter((event) => { const time = new Date(event.occurredAt).getTime(); return time >= start.getTime() && time <= reference.getTime(); })
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  const documents = (options.documents ?? [])
    .filter((document) => document.profileId === options.profileId)
    .filter((document) => { const time = new Date(document.occurredAt ?? 0).getTime(); return time >= start.getTime() && time <= reference.getTime(); })
    .sort((a, b) => +new Date(b.occurredAt ?? 0) - +new Date(a.occurredAt ?? 0));
  const counts = Object.fromEntries(kinds.map((kind) => [kind, filtered.filter((event) => event.kind === kind).length])) as Record<EventKind, number>;
  const sourceCounts = filtered.reduce<Partial<Record<SourceKind, number>>>((acc, event) => ({ ...acc, [event.source]: (acc[event.source] ?? 0) + 1 }), {});
  const sleepMinutes = filtered.filter((event) => event.kind === 'sleep').reduce((sum, event) => sum + (event.value ?? 0), 0);
  const fmt = (date: Date) => date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const suggested = options.type === 'illness'
    ? ['¿Qué cambios o señales justificarían una nueva valoración?', '¿Qué información conviene seguir registrando durante la recuperación?']
    : ['¿Los patrones registrados son adecuados para su etapa?', '¿Qué cambios sería importante vigilar antes del siguiente control?'];
  return {
    type: options.type,
    profileName: options.shareProfileName === false ? 'Perfil sin nombre' : options.profileName,
    periodTitle: period.title,
    dateRange: `${fmt(start)} - ${fmt(reference)}`,
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: reference.toISOString().slice(0, 10),
    events: filtered,
    sections: new Set(options.sections),
    counts,
    sleepMinutes,
    sourceCounts,
    questions: [...(options.customQuestions ?? []).map((question) => question.trim()).filter(Boolean), ...suggested],
    reason: options.reason?.trim() || undefined,
    prenatalRecord: options.prenatalRecord,
    birthRecord: options.birthRecord,
    postpartumRecord: options.postpartumRecord,
    documents,
    format: options.format ?? 'complete'
  };
}

export function assessReportReadiness(report: ConsultationReportData): ReportReadiness {
  const hasReason = Boolean(report.reason);
  const hasQuestions = report.questions.length > 2;
  const hasCare = report.counts.feeding + report.counts.diaper > 0;
  const hasSymptoms = report.counts.temperature + report.counts.symptom > 0;
  const hasGrowth = report.counts.growth > 0;
  const items: ReportReadinessItem[] = [
    { id: 'content', level: report.events.length || report.documents.length || report.prenatalRecord || report.birthRecord || report.postpartumRecord ? 'ready' : 'review', label: 'Información del periodo', detail: report.events.length ? `${report.events.length} registros seleccionados` : report.documents.length ? `${report.documents.length} documentos seleccionados` : report.prenatalRecord ? 'Expediente prenatal disponible' : report.birthRecord || report.postpartumRecord ? 'Historia de nacimiento o posparto disponible' : 'Cambia el periodo o agrega registros' },
    { id: 'reason', level: hasReason ? 'ready' : 'review', label: 'Motivo de consulta', detail: hasReason ? 'Descrito por la familia' : 'Agrega qué deseas revisar y desde cuándo' },
    { id: 'questions', level: hasQuestions ? 'ready' : 'review', label: 'Preguntas propias', detail: hasQuestions ? 'Incluidas antes de las sugerencias' : 'Añade al menos una pregunta para no olvidarla' }
  ];
  if (report.type === 'illness') {
    items.push(
      { id: 'symptoms', level: hasSymptoms ? 'ready' : 'review', label: 'Síntomas y temperatura', detail: hasSymptoms ? 'Hay observaciones en el periodo' : 'Confirma si no hubo medición u observaciones' },
      { id: 'care', level: hasCare ? 'ready' : 'review', label: 'Alimentación y pañales', detail: hasCare ? 'Hay registros en el periodo' : 'Confirma si estos datos no se registraron' }
    );
  } else if (!report.prenatalRecord) {
    items.push({ id: 'growth', level: hasGrowth ? 'ready' : 'review', label: 'Crecimiento', detail: hasGrowth ? 'Hay mediciones en el periodo' : 'No hay mediciones seleccionadas' });
  }
  const completed = items.filter((item) => item.level === 'ready').length;
  return { readyToExport: Boolean(report.events.length || report.documents.length || report.prenatalRecord || report.birthRecord || report.postpartumRecord), completed, total: items.length, items };
}

const dataLabels: Record<string, string> = { milkType: 'Contenido', amount: 'Cantidad', unit: 'Unidad', location: 'Lugar', quality: 'Cómo fue', color: 'Color', consistency: 'Consistencia', temperature: 'Temperatura', temperatureUnit: 'Unidad', method: 'Método', symptom: 'Síntoma', intensity: 'Intensidad', frequency: 'Frecuencia', medicine: 'Medicamento', dose: 'Dosis administrada', route: 'Vía', vaccine: 'Vacuna', reaction: 'Reacción observada', measurement: 'Medición', measurementUnit: 'Unidad', professional: 'Profesional', maternalWeight: 'Peso materno', bloodPressure: 'Presión arterial', uterineHeight: 'Altura uterina', fetalHeartRate: 'Frecuencia cardiaca fetal', study: 'Estudio', gestationalAge: 'Edad gestacional', estimatedFetalWeight: 'Peso fetal estimado', percentile: 'Percentil', placenta: 'Placenta', amnioticFluid: 'Líquido amniótico', cervicalLength: 'Longitud cervical', result: 'Resultado', glucose: 'Glucosa', instructions: 'Indicaciones', nextAppointment: 'Próxima cita', measuredBy: 'Medido por', duration: 'Duración aproximada', context: 'Contexto previo', response: 'Qué se intentó', outcome: 'Qué ocurrió después', timing: 'Momento', amountDescription: 'Cantidad observada', appearance: 'Aspecto observado', routineName: 'Rutina' };
const structuredDetails = (event: FamilyEvent) => event.data && Object.keys(event.data).length
  ? `<div class="structured">${Object.entries(event.data).map(([key, value]) => `<div><b>${escapeHtml(dataLabels[key] ?? key)}:</b> ${escapeHtml(String(value))}</div>`).join('')}</div>`
  : '';
const eventTable = (events: FamilyEvent[]) => events.length
  ? `<table><thead><tr><th>Fecha y hora</th><th>Registro</th><th>Detalle</th><th>Origen</th></tr></thead><tbody>${events.map((event) => `<tr><td>${new Date(event.occurredAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td><td>${escapeHtml(event.title)}</td><td>${structuredDetails(event) || escapeHtml(event.detail)}</td><td>${sourceLabel[event.source]}</td></tr>`).join('')}</tbody></table>`
  : '<p class="empty">No hay registros en este periodo.</p>';

export function briefConsultationEvents(events: FamilyEvent[], limit = 5) {
  const ordered = [...events].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  const priorities: EventKind[][] = [['temperature', 'symptom'], ['medicine'], ['feeding'], ['diaper'], ['sleep']];
  const selected: FamilyEvent[] = [];
  for (const group of priorities) {
    const event = ordered.find((item) => group.includes(item.kind) && !selected.some((selectedItem) => selectedItem.id === item.id));
    if (event) selected.push(event);
  }
  for (const event of ordered) if (selected.length < limit && !selected.some((item) => item.id === event.id)) selected.push(event);
  return selected.slice(0, limit).sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
}

const documentTable = (documents: DocumentRecord[]) => documents.length
  ? `<table><thead><tr><th>Fecha</th><th>Documento</th><th>Datos para consulta</th><th>Estado</th></tr></thead><tbody>${documents.map((document) => {
      const facts = document.status === 'reviewed' && document.extracted.length ? document.extracted.join(' · ') : 'Sin datos confirmados';
      const state = document.status === 'reviewed' ? 'Datos confirmados por la familia' : 'Guardado sin análisis confirmado';
      const date = document.occurredAt ? new Date(document.occurredAt).toLocaleDateString('es-MX') : document.date;
      return `<tr><td>${escapeHtml(date)}</td><td>${escapeHtml(document.name)}<br><span class="section-note">${escapeHtml(document.category)}</span></td><td>${escapeHtml(facts)}</td><td>${state}</td></tr>`;
    }).join('')}</tbody></table>`
  : '<p class="empty">No hay documentos guardados en este periodo.</p>';

const prenatalLabels: Partial<Record<keyof PrenatalRecord, string>> = { planningStarted: 'Inicio de planeación', lastMenstrualPeriod: 'Fecha de última menstruación', dueDate: 'Fecha probable de parto', dueDateConfirmedBy: 'Base de la FPP', folicAcidStarted: 'Inicio de ácido fólico', folicAcidDose: 'Dosis indicada', supplements: 'Suplementos', medicalHistory: 'Antecedentes personales', previousPregnancies: 'Embarazos anteriores', familyHistory: 'Antecedentes familiares', complications: 'Complicaciones o vigilancia', primaryProfessional: 'Profesional principal' };
const prenatalHtml = (record?: PrenatalRecord) => {
  if (!record) return '<p class="empty">No hay expediente prenatal asociado.</p>';
  const rows = Object.entries(prenatalLabels).flatMap(([key, label]) => { const value = record[key as keyof PrenatalRecord]; return value ? [`<tr><td><b>${escapeHtml(label!)}</b></td><td>${escapeHtml(String(value))}</td><td>Familia</td></tr>`] : []; });
  return rows.length ? `<table><thead><tr><th>Dato</th><th>Valor registrado</th><th>Origen</th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '<p class="empty">El expediente prenatal aún no contiene datos.</p>';
};
const birthLabels: Partial<Record<keyof BirthRecord,string>> = { bornAt:'Fecha y hora de nacimiento',gestationalAge:'Edad gestacional',birthType:'Tipo de nacimiento',weight:'Peso al nacer',length:'Talla al nacer',headCircumference:'Perímetro cefálico',apgar:'Apgar documentado',complications:'Complicaciones documentadas',neonatalCare:'Atención neonatal',feedingStart:'Inicio de alimentación' };
const postpartumLabels: Partial<Record<keyof PostpartumRecord,string>> = { followUpDate:'Revisión posparto',recoveryNotes:'Recuperación física',feedingNotes:'Lactancia o alimentación',restAndSupport:'Descanso y apoyo',emotionalWellbeing:'Nota de bienestar emocional',medications:'Medicamentos indicados',professionalInstructions:'Indicaciones profesionales' };
const continuityTable = (record: BirthRecord | PostpartumRecord | undefined, labels: Partial<Record<string,string>>) => {
  if (!record) return '<p class="empty">No hay información registrada.</p>';
  const source = record.confirmedBy ? `Registrado por la familia · fuente declarada: ${escapeHtml(record.confirmedBy)}` : 'Registrado por la familia · fuente profesional no indicada';
  const rows = Object.entries(labels).flatMap(([key,label]) => { const value = (record as unknown as Record<string,unknown>)[key]; return value ? [`<tr><td><b>${escapeHtml(label!)}</b></td><td>${escapeHtml(String(value))}</td><td>${source}</td></tr>`] : []; });
  return rows.length ? `<table><thead><tr><th>Dato</th><th>Valor registrado</th><th>Origen</th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '<p class="empty">El expediente existe, pero no contiene campos para compartir.</p>';
};

export function buildConsultationReport(events: FamilyEvent[], optionsOrType: ConsultationReportOptions | ReportType) {
  const options: ConsultationReportOptions = typeof optionsOrType === 'string'
    ? { type: optionsOrType, profileId: 'emilia', profileName: 'Emilia', period: '7d', sections: reportSections.map((item) => item.id), referenceDate: events.length ? new Date(Math.max(...events.map((event) => new Date(event.occurredAt).getTime()))) : new Date() }
    : optionsOrType;
  const data = createConsultationReport(events, options);
  const selectedKinds: { section: ReportSection; title: string; kinds: EventKind[] }[] = [
    { section: 'care', title: 'Alimentación y pañales', kinds: ['feeding', 'diaper'] },
    { section: 'sleep', title: 'Sueño', kinds: ['sleep'] },
    { section: 'symptoms', title: 'Temperatura y síntomas', kinds: ['temperature', 'symptom'] },
    { section: 'comfort', title: 'Rutinas y confort', kinds: ['comfort'] },
    { section: 'treatments', title: 'Medicamentos y vacunas', kinds: ['medicine'] },
    { section: 'growth', title: 'Crecimiento', kinds: ['growth', 'prenatal'] }
  ];
  const sectionsHtml = selectedKinds.filter((group) => data.sections.has(group.section)).map((group) => `<h2>${group.title}</h2>${eventTable(data.events.filter((event) => group.kinds.includes(event.kind)))}`).join('');
  const timeline = data.sections.has('timeline') ? `<h2>Línea de tiempo</h2>${eventTable(data.events)}` : '';
  const prenatal = data.sections.has('prenatal') ? `<h2>Expediente prenatal actual</h2><p class="section-note">Esta sección puede incluir información anterior al periodo seleccionado.</p>${prenatalHtml(data.prenatalRecord)}` : '';
  const documents = data.sections.has('documents') ? `<h2>Documentos del periodo</h2><p class="section-note">Emi sólo muestra datos confirmados por la familia. Un archivo guardado sin análisis se identifica expresamente.</p>${documentTable(data.documents)}` : '';
  const birthPostpartum = data.sections.has('birthPostpartum') ? `<h2>Nacimiento</h2><p class="section-note">Información histórica registrada; no es una interpretación clínica.</p>${continuityTable(data.birthRecord,birthLabels)}<h2>Posparto materno</h2>${continuityTable(data.postpartumRecord,postpartumLabels)}` : '';
  const questions = data.sections.has('questions') ? `<h2>Preguntas para el profesional</h2><ol>${data.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ol>` : '';
  const reason = data.reason ? `<div class="reason"><b>Motivo o prioridad para esta consulta</b><p>${escapeHtml(data.reason)}</p></div>` : '';
  const sleep = data.sleepMinutes >= 60 ? `${Math.floor(data.sleepMinutes / 60)} h ${data.sleepMinutes % 60} min` : `${data.sleepMinutes} min`;
  const briefContent = `<h2>Registros representativos para comentar</h2><p class="section-note">Selección por categorías; no es una clasificación de gravedad.</p>${eventTable(briefConsultationEvents(data.events))}${data.sections.has('documents') ? `<h2>Documentos</h2>${documentTable(data.documents.slice(0, 2))}` : ''}${data.sections.has('questions') ? `<h2>Preguntas prioritarias</h2><ol>${data.questions.slice(0, 3).map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ol>` : ''}`;
  const completeContent = `${sectionsHtml}${documents}${prenatal}${birthPostpartum}${timeline}${questions}`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#233d3a;padding:36px;font-size:12px}h1{font-size:25px;margin:0}h2{font-size:15px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:7px}.meta,.section-note{color:#6c7c78;margin-top:6px}.notice{background:#f1f5f3;border-left:4px solid #547d73;padding:12px;margin:18px 0}.reason{background:#fff5eb;border:1px solid #ead6c5;border-radius:10px;padding:12px;margin:14px 0}.reason p{margin:5px 0 0}.stats{display:flex;gap:10px;flex-wrap:wrap}.stat{border:1px solid #ddd;border-radius:10px;padding:10px;min-width:90px}.stat b{display:block;font-size:18px}table{border-collapse:collapse;width:100%;margin-top:10px}th,td{text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #e7e5df}th{font-size:10px;color:#6c7c78}.structured div{margin-bottom:3px}.empty,.footer{color:#6c7c78}.footer{margin-top:30px;font-size:10px}</style></head><body><h1>${data.format === 'brief' ? 'Resumen breve para consulta' : 'Resumen para consulta'}</h1><p class="meta">${escapeHtml(data.profileName)} · ${data.type === 'routine' ? 'Control rutinario' : 'Consulta por enfermedad'} · ${escapeHtml(data.periodTitle)} (${escapeHtml(data.dateRange)})</p><div class="notice"><b>Importante:</b> este resumen organiza registros familiares, datos documentales confirmados y cálculos de la app. No es un expediente médico, diagnóstico ni recomendación de tratamiento.</div>${reason}<h2>Vista rápida</h2><div class="stats"><div class="stat"><b>${data.counts.feeding}</b>Tomas</div><div class="stat"><b>${sleep}</b>Sueño registrado</div><div class="stat"><b>${data.counts.diaper}</b>Pañales</div><div class="stat"><b>${data.counts.temperature + data.counts.symptom}</b>Temperaturas y síntomas</div><div class="stat"><b>${data.documents.length}</b>Documentos</div></div>${data.format === 'brief' ? briefContent : completeContent}<p class="footer">Generado por Emi con ${data.events.length} registros y ${data.documents.length} documentos del perfil seleccionado. Cada bebé y embarazo es distinto. Revisa el contenido antes de compartirlo.</p></body></html>`;
}

export function buildConsultationText(report: ConsultationReportData) {
  const sleep = report.sleepMinutes >= 60 ? `${Math.floor(report.sleepMinutes / 60)} h ${report.sleepMinutes % 60} min` : `${report.sleepMinutes} min`;
  const events = (report.format === 'brief' ? briefConsultationEvents(report.events) : report.events).slice(0, report.format === 'brief' ? 5 : 30);
  const lines = [
    report.format === 'brief' ? 'RESUMEN BREVE PARA CONSULTA' : 'RESUMEN PARA CONSULTA',
    `${report.profileName} · ${report.periodTitle} · ${report.dateRange}`,
    '',
    'Este texto organiza registros familiares. No es diagnóstico ni recomendación de tratamiento.',
    ...(report.reason ? ['', `Motivo: ${report.reason}`] : []),
    '',
    `Vista rápida: ${report.counts.feeding} tomas · ${sleep} de sueño registrado · ${report.counts.diaper} pañales · ${report.counts.temperature + report.counts.symptom} temperaturas o síntomas · ${report.documents.length} documentos`,
    '',
    'Registros para comentar:',
    ...(events.length ? events.map((event) => `- ${new Date(event.occurredAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}: ${event.title} — ${event.detail} [${sourceLabel[event.source]}]`) : ['- Sin registros en el periodo.']),
    ...(report.sections.has('documents') ? ['', 'Documentos:', ...(report.documents.slice(0, report.format === 'brief' ? 2 : 10).map((document) => `- ${document.name}: ${document.status === 'reviewed' && document.extracted.length ? document.extracted.join(' · ') : 'guardado sin datos confirmados'}`))] : []),
    ...(report.sections.has('questions') ? ['', 'Preguntas:', ...report.questions.slice(0, report.format === 'brief' ? 3 : 10).map((question) => `- ${question}`)] : []),
    '',
    'Cada bebé y embarazo es distinto. Revisa el contenido antes de compartirlo.'
  ];
  return lines.join('\n');
}
