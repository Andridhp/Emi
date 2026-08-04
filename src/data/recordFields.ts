export type RecordField = { key: string; label: string; placeholder: string; keyboard?: 'default' | 'numeric'; optional?: boolean };

const fields: Record<string, RecordField[]> = {
  'feeding:Biberón': [
    { key: 'milkType', label: 'Contenido', placeholder: 'Leche materna, fórmula o mixta' },
    { key: 'amount', label: 'Cantidad', placeholder: 'Ej. 90', keyboard: 'numeric' },
    { key: 'unit', label: 'Unidad', placeholder: 'ml u oz' }
  ],
  'feeding:Extracción': [
    { key: 'side', label: 'Pecho', placeholder: 'Izquierdo, derecho o ambos' },
    { key: 'amount', label: 'Cantidad obtenida', placeholder: 'Ej. 80', keyboard: 'numeric' },
    { key: 'unit', label: 'Unidad', placeholder: 'ml u oz' },
    { key: 'storage', label: 'Almacenamiento', placeholder: 'Refrigerador, congelador…', optional: true }
  ],
  'feeding:Alimento': [
    { key: 'food', label: 'Alimento', placeholder: 'Qué comió' },
    { key: 'amount', label: 'Cantidad aproximada', placeholder: 'Ej. 3 cucharaditas', optional: true },
    { key: 'reaction', label: 'Reacción observada', placeholder: 'Sin reacción, sarpullido…', optional: true }
  ],
  'sleep:Periodo anterior': [
    { key: 'location', label: 'Lugar', placeholder: 'Cuna, brazos, portabebé…', optional: true },
    { key: 'quality', label: 'Cómo fue', placeholder: 'Tranquilo, con despertares…', optional: true }
  ],
  'diaper:Evacuación': [
    { key: 'color', label: 'Color', placeholder: 'Amarillo, verde, café…', optional: true },
    { key: 'consistency', label: 'Consistencia', placeholder: 'Líquida, pastosa, dura…', optional: true },
    { key: 'notes', label: 'Algo más', placeholder: 'Moco, esfuerzo, olor distinto…', optional: true }
  ],
  'diaper:Ambos': [
    { key: 'color', label: 'Color de evacuación', placeholder: 'Amarillo, verde, café…', optional: true },
    { key: 'consistency', label: 'Consistencia', placeholder: 'Líquida, pastosa, dura…', optional: true }
  ],
  'comfort:Irritabilidad': [
    { key: 'duration', label: 'Duración aproximada', placeholder: 'Ej. 20 minutos', optional: true },
    { key: 'context', label: 'Qué ocurría antes', placeholder: 'Después de comer, al despertar…', optional: true },
    { key: 'response', label: 'Qué se intentó', placeholder: 'Brazos, cambio de posición…', optional: true },
    { key: 'outcome', label: 'Qué observaste después', placeholder: 'Se calmó, continuó igual…', optional: true }
  ],
  'comfort:Gases': [
    { key: 'duration', label: 'Duración aproximada', placeholder: 'Ej. 15 minutos', optional: true },
    { key: 'context', label: 'Contexto', placeholder: 'Antes o después de una toma…', optional: true },
    { key: 'response', label: 'Qué se intentó', placeholder: 'Describe la estrategia', optional: true },
    { key: 'outcome', label: 'Respuesta observada', placeholder: 'Solo lo que ocurrió', optional: true }
  ],
  'comfort:Regurgitación': [
    { key: 'timing', label: 'Cuándo ocurrió', placeholder: 'Durante o después de comer…', optional: true },
    { key: 'amountDescription', label: 'Cantidad observada', placeholder: 'Pequeña, moderada…', optional: true },
    { key: 'appearance', label: 'Aspecto observado', placeholder: 'Describe sin interpretar', optional: true },
    { key: 'response', label: 'Qué se hizo después', placeholder: 'Cambio de ropa, posición…', optional: true }
  ],
  'comfort:Rutina': [
    { key: 'routineName', label: 'Nombre de la rutina', placeholder: 'Baño, paseo, calma antes de dormir…' },
    { key: 'duration', label: 'Duración aproximada', placeholder: 'Ej. 30 minutos', optional: true },
    { key: 'context', label: 'Cómo fue', placeholder: 'Pasos o contexto que quieras recordar', optional: true },
    { key: 'outcome', label: 'Respuesta observada', placeholder: 'Tranquilo, inquieto…', optional: true }
  ],
  'symptom:Temperatura': [
    { key: 'temperature', label: 'Temperatura', placeholder: 'Ej. 37.8', keyboard: 'numeric' },
    { key: 'temperatureUnit', label: 'Unidad', placeholder: '°C o °F' },
    { key: 'method', label: 'Método', placeholder: 'Axilar, rectal, oído…' }
  ],
  'symptom:Síntoma': [
    { key: 'symptom', label: 'Qué observaste', placeholder: 'Tos, congestión, vómito…' },
    { key: 'intensity', label: 'Intensidad', placeholder: 'Leve, moderada o intensa' },
    { key: 'frequency', label: 'Frecuencia', placeholder: 'Una vez, intermitente…', optional: true }
  ],
  'symptom:Estado de ánimo': [
    { key: 'mood', label: 'Conducta', placeholder: 'Irritable, somnoliento, activo…' },
    { key: 'duration', label: 'Duración aproximada', placeholder: 'Ej. 30 minutos', optional: true }
  ],
  'medicine:Medicamento': [
    { key: 'medicine', label: 'Medicamento', placeholder: 'Nombre indicado' },
    { key: 'dose', label: 'Dosis administrada', placeholder: 'Exactamente como fue indicada' },
    { key: 'route', label: 'Vía', placeholder: 'Oral, tópica…' },
    { key: 'indicatedBy', label: 'Indicado por', placeholder: 'Profesional tratante', optional: true }
  ],
  'medicine:Vacuna': [
    { key: 'vaccine', label: 'Vacuna', placeholder: 'Nombre de la vacuna' },
    { key: 'lot', label: 'Lote', placeholder: 'Si aparece en la cartilla', optional: true },
    { key: 'reaction', label: 'Reacción observada', placeholder: 'Ninguna, dolor local…', optional: true }
  ],
  'growth:Peso': [{ key: 'measurement', label: 'Peso', placeholder: 'Ej. 5.4', keyboard: 'numeric' }, { key: 'measurementUnit', label: 'Unidad', placeholder: 'kg o lb' }, { key: 'confirmedBy', label: 'Medido por', placeholder: 'Familia o profesional', optional: true }],
  'growth:Talla': [{ key: 'measurement', label: 'Talla', placeholder: 'Ej. 59', keyboard: 'numeric' }, { key: 'measurementUnit', label: 'Unidad', placeholder: 'cm o in' }, { key: 'confirmedBy', label: 'Medido por', placeholder: 'Familia o profesional', optional: true }],
  'growth:Hito': [{ key: 'milestone', label: 'Hito observado', placeholder: 'Describe exactamente lo que hizo' }, { key: 'category', label: 'Área', placeholder: 'Movimiento, comunicación, interacción, juego o autonomía' }, { key: 'context', label: 'Contexto', placeholder: 'Cómo y cuándo ocurrió', optional: true }, { key: 'observedBy', label: 'Observado por', placeholder: 'Mamá, papá, cuidador…', optional: true }],
  'prenatal:Ginecología': [
    { key: 'professional', label: 'Profesional o clínica', placeholder: 'Nombre o especialidad' },
    { key: 'maternalWeight', label: 'Peso materno', placeholder: 'Ej. 64 kg', optional: true },
    { key: 'bloodPressure', label: 'Presión arterial', placeholder: 'Ej. 110/70 mmHg', optional: true },
    { key: 'uterineHeight', label: 'Altura uterina', placeholder: 'Como aparece en la nota', optional: true },
    { key: 'fetalHeartRate', label: 'Frecuencia cardiaca fetal', placeholder: 'Como aparece en la nota', optional: true },
    { key: 'findings', label: 'Hallazgos documentados', placeholder: 'Lo escrito por el profesional', optional: true },
    { key: 'instructions', label: 'Indicaciones', placeholder: 'Estudios o próximos pasos', optional: true },
    { key: 'nextAppointment', label: 'Próxima cita', placeholder: 'AAAA-MM-DD', optional: true }
  ],
  'prenatal:Materno-fetal': [
    { key: 'study', label: 'Tipo de revisión', placeholder: 'Primer trimestre, estructural, Doppler…' },
    { key: 'gestationalAge', label: 'Edad gestacional del informe', placeholder: 'Ej. 22 semanas + 3 días', optional: true },
    { key: 'estimatedFetalWeight', label: 'Peso fetal estimado', placeholder: 'Como aparece en el informe', optional: true },
    { key: 'percentile', label: 'Percentil', placeholder: 'Como aparece en el informe', optional: true },
    { key: 'placenta', label: 'Placenta', placeholder: 'Localización descrita', optional: true },
    { key: 'amnioticFluid', label: 'Líquido amniótico', placeholder: 'Descripción o medición', optional: true },
    { key: 'cervicalLength', label: 'Longitud cervical', placeholder: 'Si fue informada', optional: true },
    { key: 'recommendation', label: 'Recomendación escrita', placeholder: 'Seguimiento indicado', optional: true },
    { key: 'nextAppointment', label: 'Próxima revisión', placeholder: 'AAAA-MM-DD', optional: true }
  ],
  'prenatal:Laboratorio': [
    { key: 'study', label: 'Estudio', placeholder: 'Biometría, glucosa, orina…' },
    { key: 'result', label: 'Resultado', placeholder: 'Valor y unidad tal como aparecen', optional: true },
    { key: 'documentReference', label: 'Documento relacionado', placeholder: 'Nombre del archivo', optional: true },
    { key: 'instructions', label: 'Indicación profesional', placeholder: 'Repetir, vigilar o comentar', optional: true }
  ],
  'prenatal:Medición materna': [
    { key: 'maternalWeight', label: 'Peso', placeholder: 'Ej. 64 kg', optional: true },
    { key: 'bloodPressure', label: 'Presión arterial', placeholder: 'Ej. 110/70 mmHg', optional: true },
    { key: 'glucose', label: 'Glucosa', placeholder: 'Valor, unidad y contexto', optional: true },
    { key: 'measuredBy', label: 'Registrado o medido por', placeholder: 'Familia, clínica o profesional' }
  ],
  'prenatal:Síntoma': [{ key: 'symptom', label: 'Qué observaste', placeholder: 'Describe el síntoma' }, { key: 'intensity', label: 'Intensidad', placeholder: 'Leve, moderada o intensa' }]
};

export const recordFieldsFor = (kind: string, title: string) => fields[`${kind}:${title}`] ?? [];

export function summarizeRecordData(data: Record<string, string>) {
  return Object.values(data).map((value) => value.trim()).filter(Boolean).join(' · ');
}
