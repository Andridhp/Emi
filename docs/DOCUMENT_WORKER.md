# Trabajador documental protegido

El cliente nunca llama directamente a antivirus, OCR ni IA. Sólo solicita un trabajo después de comprobar acceso y consentimiento. La función `document-worker` consume una tarea por invocación.

## Recorrido

1. `claim_document_processing_job` bloquea una tarea con `FOR UPDATE SKIP LOCKED` y un arrendamiento temporal.
2. El trabajador descarga el archivo desde `medical-documents` usando una credencial exclusiva del servidor.
3. Comprueba nuevamente tamaño y metadatos y calcula SHA-256.
4. Envía el binario al servicio antimalware contratado.
5. Si el archivo está limpio, solicita OCR y limita el texto resultante a 250 000 caracteres.
6. El extractor recibe únicamente ese documento, el idioma y el esquema permitido.
7. `validateDocumentExtraction` rechaza salidas fuera del contrato.
8. Las propuestas se guardan en `extracted_facts` sin confirmación.
9. La familia compara, corrige y confirma campos desde Emi.

Los fallos no incorporan datos. Tras tres arrendamientos vencidos, la tarea se marca como fallida y puede solicitarse nuevamente desde la aplicación.

## Contratos de proveedores

Antimalware responde JSON:

```json
{ "clean": true, "engine": "nombre", "version": "versión" }
```

OCR recibe el archivo como `multipart/form-data` y responde:

```json
{ "text": "texto extraído", "pages": [], "processor": "nombre", "version": "versión" }
```

Extracción recibe JSON y debe responder el esquema `1.0`:

```json
{
  "schemaVersion": "1.0",
  "documentType": "Laboratorio",
  "facts": [
    {
      "fieldName": "Hemoglobina",
      "rawValue": "Hemoglobina 11.4 g/dL",
      "normalizedValue": { "value": "11.4", "unit": "g/dL" },
      "confidence": 0.91,
      "pageNumber": 2
    }
  ]
}
```

No se admiten diagnósticos, urgencias, prescripciones ni recomendaciones dentro de este contrato.

## Despliegue

1. Ejecutar las migraciones hasta `009_document_worker_runtime.sql`.
2. Configurar los secretos mostrados en `.env.example` dentro del entorno de funciones; nunca en variables `EXPO_PUBLIC_*`.
3. Desplegar `supabase/functions/document-worker`.
4. Invocarla mediante una tarea programada protegida con `x-worker-secret`.
5. Ensayar archivos limpios, infectados, corruptos, vacíos, demasiado grandes y respuestas de proveedor fuera del esquema.
6. Revisar contratos, residencia, retención y eliminación de los proveedores antes de utilizar documentos reales.

La función no escribe texto OCR ni contenido médico en logs operativos. La tabla `document_analysis_runs` conserva únicamente proveedor, versión, etapa y hashes.
